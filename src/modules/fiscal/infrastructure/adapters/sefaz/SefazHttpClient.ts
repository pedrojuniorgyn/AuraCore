/**
 * 🌐 SEFAZ HTTP CLIENT - INFRASTRUCTURE ADAPTER
 * 
 * Cliente HTTP real para comunicação com webservices SEFAZ.
 * Implementa:
 * - mTLS (Mutual TLS) com certificado A1 (.pfx)
 * - Assinatura XML via xml-crypto + node-forge
 * - Retry com exponential backoff (SefazRetryPolicy)
 * - SOAP envelope wrapper
 * 
 * F3.1: Comunicação real com SEFAZ
 * 
 * @module fiscal/infrastructure/adapters/sefaz
 */

import { injectable } from 'tsyringe';
import * as https from 'node:https';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from 'xmldom';
import { Result } from '@/shared/domain';
import { SefazRetryPolicy } from '../../../domain/services/SefazRetryPolicy';
import { SefazXmlSigner } from '../../../domain/services/SefazXmlSigner';
import type { RetryConfig } from '../../../domain/services/SefazRetryPolicy';
import { logger } from '@/shared/infrastructure/logging';

// ============================================================================
// TYPES
// ============================================================================

export interface SefazCertificate {
  pfxBuffer: Buffer;
  password: string;
}

export interface SefazRequestConfig {
  url: string;
  soapAction: string;
  xmlContent: string;
  certificate: SefazCertificate;
  timeoutMs?: number;
}

export interface SefazResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

interface ExtractedCredentials {
  privateKeyPem: string;
  certificatePem: string;
  certificateBase64: string;
  ca?: string[];
}

// ============================================================================
// SEFAZ HTTP CLIENT
// ============================================================================

@injectable()
export class SefazHttpClient {
  /**
   * Extrai chave privada e certificado do PFX (A1).
   * Usa node-forge para parse do PKCS#12.
   */
  static extractCredentials(pfxBuffer: Buffer, password: string): Result<ExtractedCredentials, string> {
    try {
      const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

      const certBag = certBags[forge.pki.oids.certBag]?.[0];
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!certBag?.cert || !keyBag?.key) {
        return Result.fail('Certificado A1 inválido: chave ou certificado não encontrados');
      }

      const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
      const certificatePem = forge.pki.certificateToPem(certBag.cert);
      const certificateBase64 = certificatePem
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\n/g, '');

      // Extrair CAs intermediárias (se existirem)
      const allCertBags = certBags[forge.pki.oids.certBag] ?? [];
      const ca = allCertBags
        .filter((bag) => bag.cert && bag !== certBag)
        .map((bag) => forge.pki.certificateToPem(bag.cert!));

      return Result.ok({ privateKeyPem, certificatePem, certificateBase64, ca });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.fail(`Falha ao extrair credenciais do PFX: ${msg}`);
    }
  }

  /**
   * Assina XML fiscal usando xml-crypto.
   * Usa configuração do SefazXmlSigner (Domain Service).
   */
  static signXml(
    xmlContent: string,
    documentType: 'cte' | 'nfe' | 'mdfe' | 'evento',
    privateKeyPem: string,
    certificateBase64: string
  ): Result<string, string> {
    try {
      // Validar parâmetros via Domain Service
      const validation = SefazXmlSigner.validateSigningParams({
        xmlContent,
        documentType,
        privateKeyPem,
        certificateBase64,
      });

      if (Result.isFail(validation)) {
        return Result.fail(validation.error);
      }

      // Obter configuração do Domain Service
      const config = SefazXmlSigner.getSigningConfig(documentType);

      // Criar assinatura com xml-crypto
      const sig = new SignedXml();
      sig.addReference({
        xpath: config.referenceXpath,
        transforms: config.transforms,
        digestAlgorithm: config.digestAlgorithm,
      });

      // Configurar algoritmos
      interface SignedXmlExtended {
        signingKey: string;
        signatureAlgorithm: string;
        canonicalizationAlgorithm: string;
        keyInfoProvider: unknown;
      }

      (sig as unknown as SignedXmlExtended).signingKey = privateKeyPem;
      sig.signatureAlgorithm = config.signatureAlgorithm;
      sig.canonicalizationAlgorithm = config.canonicalizationAlgorithm;

      // KeyInfo com certificado
      const keyInfoXml = SefazXmlSigner.generateKeyInfoXml(certificateBase64);
      (sig as unknown as SignedXmlExtended).keyInfoProvider = {
        getKeyInfo: () => keyInfoXml,
      };

      // Computar assinatura
      sig.computeSignature(xmlContent, {
        location: { reference: config.signatureLocation, action: 'after' },
      });

      return Result.ok(sig.getSignedXml());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.fail(`Falha na assinatura XML: ${msg}`);
    }
  }

  /**
   * Envolve XML em SOAP envelope para webservices SEFAZ.
   */
  static buildSoapEnvelope(xmlContent: string, soapAction: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header/>
  <soap12:Body>
    ${xmlContent}
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Envia requisição HTTPS com mTLS para SEFAZ.
   * 
   * - Extrai key/cert do PFX
   * - Configura https.Agent com mTLS
   * - Envia SOAP request
   * - Retry com exponential backoff
   */
  async send(config: SefazRequestConfig): Promise<Result<SefazResponse, string>> {
    // 1. Extrair credenciais do PFX
    const credResult = SefazHttpClient.extractCredentials(
      config.certificate.pfxBuffer,
      config.certificate.password
    );

    if (Result.isFail(credResult)) {
      return Result.fail(credResult.error);
    }

    const creds = credResult.value;

    // 2. Build SOAP envelope
    const soapXml = SefazHttpClient.buildSoapEnvelope(config.xmlContent, config.soapAction);

    // 3. Configurar https.Agent com mTLS
    const agent = new https.Agent({
      pfx: config.certificate.pfxBuffer,
      passphrase: config.certificate.password,
      rejectUnauthorized: true, // Validar certificado SEFAZ
      secureProtocol: 'TLS_method',
    });

    const timeoutMs = config.timeoutMs ?? 30000;

    // 4. Executar com retry
    const retryConfig: RetryConfig = {
      ...SefazRetryPolicy.DEFAULT_CONFIG,
      timeoutMs,
    };

    const result = await SefazRetryPolicy.executeWithRetry(
      () => this.doHttpsRequest(config.url, soapXml, config.soapAction, agent, timeoutMs),
      retryConfig
    );

    // Cleanup agent
    agent.destroy();

    return result;
  }

  /**
   * Execução real da requisição HTTPS.
   * Usa Node.js nativo https module para máximo controle do mTLS.
   */
  private doHttpsRequest(
    url: string,
    body: string,
    soapAction: string,
    agent: https.Agent,
    timeoutMs: number
  ): Promise<SefazResponse> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        agent,
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(body, 'utf-8').toString(),
          SOAPAction: soapAction,
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') {
              headers[key] = value;
            }
          }

          const statusCode = res.statusCode ?? 0;

          if (statusCode >= 400) {
            const error = new Error(`SEFAZ HTTP ${statusCode}: ${responseBody.substring(0, 200)}`);
            (error as { statusCode?: number }).statusCode = statusCode;
            reject(error);
            return;
          }

          resolve({
            statusCode,
            body: responseBody,
            headers,
          });
        });
      });

      req.on('error', (err) => {
        logger.error('[SEFAZ] Request error:', err.message);
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        const error = new Error(`SEFAZ timeout: ${timeoutMs}ms`);
        (error as NodeJS.ErrnoException).code = 'ETIMEDOUT';
        reject(error);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Método de conveniência: assina XML e envia para SEFAZ.
   * Combina signXml + send em uma única operação.
   */
  async signAndSend(
    xmlContent: string,
    documentType: 'cte' | 'nfe' | 'mdfe' | 'evento',
    url: string,
    soapAction: string,
    certificate: SefazCertificate
  ): Promise<Result<SefazResponse, string>> {
    // 1. Extrair credenciais
    const credResult = SefazHttpClient.extractCredentials(certificate.pfxBuffer, certificate.password);
    if (Result.isFail(credResult)) {
      return Result.fail(credResult.error);
    }

    const creds = credResult.value;

    // 2. Assinar XML
    const signResult = SefazHttpClient.signXml(
      xmlContent,
      documentType,
      creds.privateKeyPem,
      creds.certificateBase64
    );

    if (Result.isFail(signResult)) {
      return Result.fail(signResult.error);
    }

    logger.info(`[SEFAZ] Sending signed ${documentType} XML to ${url}`);

    // 3. Enviar
    return this.send({
      url,
      soapAction,
      xmlContent: signResult.value,
      certificate,
    });
  }
}
