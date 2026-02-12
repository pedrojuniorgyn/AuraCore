/**
 * 🔒 SEFAZ XML SIGNER - DOMAIN SERVICE (DOMAIN-SVC-001)
 * 
 * Assinatura digital de XMLs fiscais (NFe, CTe, MDFe).
 * Encapsula lógica de assinatura como Domain Service puro.
 * 
 * F3.1: Comunicação real com SEFAZ
 * 
 * Algoritmos conforme Manual de Orientação do Contribuinte:
 * - Signature Algorithm: RSA-SHA256
 * - Canonicalization: C14N
 * - Digest: SHA-256
 * - KeyInfo: X509Data com certificado em base64
 * 
 * Dependências de infraestrutura (xml-crypto, node-forge) são
 * injetadas via parâmetros, não importadas diretamente.
 * 
 * @see DOMAIN-SVC-005: ZERO dependências de infraestrutura
 * @see Manual de Orientação do Contribuinte - CTe v4.00
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES (Domain types - sem dependências externas)
// ============================================================================

export interface CertificateInfo {
  valid: boolean;
  cn: string;
  expiresAt: Date;
  serialNumber: string;
  issuer: string;
}

export interface SigningParams {
  /** XML a ser assinado */
  xmlContent: string;
  /** Tipo de documento (determina o xpath da referência) */
  documentType: 'cte' | 'nfe' | 'mdfe' | 'evento';
  /** Chave privada PEM */
  privateKeyPem: string;
  /** Certificado em base64 (sem headers PEM) */
  certificateBase64: string;
}

export interface SigningResult {
  signedXml: string;
  signatureValue: string;
  digestValue: string;
}

/**
 * Mapa de tipo de documento para XPath da referência a assinar.
 * Conforme Manual de Orientação do Contribuinte.
 */
const REFERENCE_XPATH: Record<string, string> = {
  cte: "//*[local-name(.)='infCte']",
  nfe: "//*[local-name(.)='infNFe']",
  mdfe: "//*[local-name(.)='infMDFe']",
  evento: "//*[local-name(.)='infEvento']",
};

/**
 * Mapa de tipo de documento para location da assinatura.
 */
const SIGNATURE_LOCATION: Record<string, string> = {
  cte: "//*[local-name(.)='infCte']",
  nfe: "//*[local-name(.)='infNFe']",
  mdfe: "//*[local-name(.)='infMDFe']",
  evento: "//*[local-name(.)='infEvento']",
};

export class SefazXmlSigner {
  private constructor() {} // DOMAIN-SVC-002: Constructor privado

  /**
   * Valida os parâmetros de assinatura.
   * Retorna Result<true, string> para indicar se pode prosseguir.
   */
  static validateSigningParams(params: SigningParams): Result<true, string> {
    if (!params.xmlContent || params.xmlContent.trim().length === 0) {
      return Result.fail('XML vazio ou não fornecido');
    }

    if (!params.privateKeyPem || !params.privateKeyPem.includes('PRIVATE KEY')) {
      return Result.fail('Chave privada PEM inválida');
    }

    if (!params.certificateBase64 || params.certificateBase64.length < 100) {
      return Result.fail('Certificado base64 inválido');
    }

    if (!REFERENCE_XPATH[params.documentType]) {
      return Result.fail(`Tipo de documento não suportado: ${params.documentType}`);
    }

    return Result.ok(true);
  }

  /**
   * Retorna configuração de assinatura para xml-crypto.
   * Separado da execução para permitir testes unitários sem xml-crypto.
   */
  static getSigningConfig(documentType: string): {
    referenceXpath: string;
    signatureLocation: string;
    transforms: string[];
    digestAlgorithm: string;
    signatureAlgorithm: string;
    canonicalizationAlgorithm: string;
  } {
    return {
      referenceXpath: REFERENCE_XPATH[documentType] || REFERENCE_XPATH.cte,
      signatureLocation: SIGNATURE_LOCATION[documentType] || SIGNATURE_LOCATION.cte,
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      ],
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    };
  }

  /**
   * Gera o bloco KeyInfo XML para inclusão na assinatura.
   */
  static generateKeyInfoXml(certificateBase64: string): string {
    return `<X509Data><X509Certificate>${certificateBase64}</X509Certificate></X509Data>`;
  }

  /**
   * Valida se o certificado está dentro da validade.
   */
  static validateCertificateExpiry(expiresAt: Date): Result<true, string> {
    const now = new Date();
    if (now > expiresAt) {
      return Result.fail(
        `Certificado digital expirado em ${expiresAt.toISOString()}. ` +
        'Renove o certificado A1 antes de transmitir documentos.'
      );
    }

    // Alertar se expira em menos de 30 dias
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (expiresAt.getTime() - now.getTime() < thirtyDaysMs) {
      // Não bloqueia, mas poderia emitir warning
    }

    return Result.ok(true);
  }
}
