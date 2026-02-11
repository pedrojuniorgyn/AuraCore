import { injectable, inject } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import https from 'https';
import axios from 'axios';
import { Result } from '@/shared/domain';
import { logger } from '@/shared/infrastructure/logging';
import type {
  ISefazGateway,
  AuthorizeCteRequest,
  AuthorizeCteResponse,
  CancelCteRequest,
  CancelCteResponse,
  QueryCteStatusRequest,
  QueryCteStatusResponse,
  InutilizeCteRequest,
  InutilizeCteResponse,
  QueryNfeRequest,
  NfeDistribuicaoResponse,
  ManifestNfeRequest,
  AuthorizeMdfeResponse,
  DistribuicaoDFeRequest,
  DistribuicaoDFeResponse,
} from '../../../domain/ports/output/ISefazGateway';
import type { ISefazClient } from '../../../domain/ports/output/ISefazClient';
import { SEFAZ_NFE_DISTRIBUICAO_URLS, UF_TO_IBGE_CODE } from './endpoints';

/**
 * SefazGatewayAdapter - Implementação real da comunicação com SEFAZ
 *
 * E7.9 Integrações - Semana 2
 * E7-Onda A: Refatorado para usar ISefazClient via DI
 *
 * Delega para ISefazClient (implementado por SefazClientAdapter) que:
 * - Gerencia endpoints por UF
 * - Gerencia assinatura XML com certificado digital
 * - Monta SOAP envelope
 * - Trata erros
 *
 * ⚠️ STATUS: Implementação parcial
 * - authorizeCte: ✅ Implementado
 * - cancelCte: ⚠️ TODO (requires SEFAZ client extension)
 * - queryCteStatus: ⚠️ TODO
 * - queryDistribuicaoDFe: ⚠️ TODO
 * - manifestNfe: ⚠️ TODO
 * - authorizeMdfe: ⚠️ TODO
 * - closeMdfe: ⚠️ TODO
 *
 * NOTA: Métodos não implementados retornam error descritivo ao invés de mock.
 */
@injectable()
export class SefazGatewayAdapter implements ISefazGateway {
  constructor(
    @inject(TOKENS.SefazClient)
    private readonly sefazClient: ISefazClient
  ) {}

  // ========== CTe Methods ==========

  async authorizeCte(request: AuthorizeCteRequest): Promise<Result<AuthorizeCteResponse, string>> {
    try {
      // Chamar cliente SEFAZ via DI
      const response = await this.sefazClient.sendCteForAuthorization(
        request.cteXml,
        {
          environment: request.environment,
          uf: request.uf,
        }
      );

      // Mapear resposta
      return Result.ok({
        success: response.success,
        protocolNumber: response.protocolNumber,
        authorizationDate: response.authorizationDate,
        cteKey: response.cteKey,
        rejectionCode: response.rejectionCode,
        rejectionMessage: response.rejectionMessage,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`SEFAZ_AUTHORIZE_CTE_FAILED: ${message}`);
    }
  }

  /**
   * Cancela CTe autorizado na SEFAZ
   * E8 Fase 2.2: Implementado usando ISefazClient
   */
  async cancelCte(request: CancelCteRequest): Promise<Result<CancelCteResponse, string>> {
    try {
      // Validar justificativa (mínimo 15 caracteres - regra SEFAZ)
      if (!request.justification || request.justification.trim().length < 15) {
        return Result.fail('Justificativa deve ter no mínimo 15 caracteres');
      }

      // Extrair UF da chave de acesso (primeiros 2 dígitos)
      const uf = this.getUfFromCteKey(request.cteKey);

      // Chamar cliente SEFAZ
      const response = await this.sefazClient.cancelCte(
        request.cteKey,
        request.protocolNumber,
        request.justification.trim(),
        {
          environment: request.environment,
          uf,
        }
      );

      if (!response.success) {
        return Result.fail(`SEFAZ_CANCEL_FAILED: ${response.message || 'Erro ao cancelar CTe'}`);
      }

      return Result.ok({
        protocolNumber: response.protocolNumber,
        cancellationDate: new Date(),
        status: response.status || 'CANCELLED',
        message: response.message,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`SEFAZ_CANCEL_CTE_ERROR: ${message}`);
    }
  }

  /**
   * Consulta status de CTe na SEFAZ
   * E8 Fase 2.2: Implementado usando ISefazClient
   */
  async queryCteStatus(request: QueryCteStatusRequest): Promise<Result<QueryCteStatusResponse, string>> {
    try {
      // Extrair UF da chave de acesso
      const uf = this.getUfFromCteKey(request.cteKey);

      // Chamar cliente SEFAZ
      const response = await this.sefazClient.queryCteStatus(request.cteKey, {
        environment: request.environment,
        uf,
      });

      // Mapear status SEFAZ para status do domínio
      const statusMap: Record<string, QueryCteStatusResponse['status']> = {
        '100': 'AUTHORIZED',
        '101': 'CANCELLED',
        '135': 'CANCELLED',
        '136': 'CANCELLED',
        '217': 'NOT_FOUND',
        '218': 'NOT_FOUND',
        '226': 'DENIED',
      };

      const domainStatus = statusMap[response.status || ''] || 'UNKNOWN';

      return Result.ok({
        status: domainStatus,
        protocolNumber: response.protocolNumber,
        authorizationDate: response.authorizationDate,
        message: response.message,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`SEFAZ_QUERY_CTE_ERROR: ${message}`);
    }
  }

  /**
   * Inutiliza numeração de CTe na SEFAZ
   * E8 Fase 2.2: Implementado usando ISefazClient
   */
  async inutilizeCte(request: InutilizeCteRequest): Promise<Result<InutilizeCteResponse, string>> {
    try {
      // Validar justificativa (mínimo 15 caracteres - regra SEFAZ)
      if (!request.justification || request.justification.trim().length < 15) {
        return Result.fail('Justificativa deve ter no mínimo 15 caracteres');
      }

      // Validar range de números
      if (request.endNumber < request.startNumber) {
        return Result.fail('Número final deve ser maior ou igual ao número inicial');
      }

      // Montar XML de inutilização
      const inutilizationXml = this.buildInutilizationXml(request);

      // Chamar cliente SEFAZ
      const response = await this.sefazClient.inutilizeCte(inutilizationXml, {
        environment: request.environment,
        uf: request.uf,
      });

      if (!response.success) {
        return Result.fail(`SEFAZ_INUTILIZATION_FAILED: ${response.message || 'Erro ao inutilizar CTe'}`);
      }

      return Result.ok({
        protocolNumber: response.protocolNumber,
        inutilizationDate: new Date(),
        status: response.status || 'INUTILIZED',
        message: response.message,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`SEFAZ_INUTILIZE_CTE_ERROR: ${message}`);
    }
  }

  // ========== Helpers Privados ==========

  /**
   * Extrai UF da chave de acesso CTe
   * Os 2 primeiros dígitos da chave são o código IBGE da UF
   */
  private getUfFromCteKey(cteKey: string): string {
    const ufCode = cteKey.substring(0, 2);
    const ufMap: Record<string, string> = {
      '12': 'AC', '27': 'AL', '13': 'AM', '16': 'AP', '29': 'BA',
      '23': 'CE', '53': 'DF', '32': 'ES', '52': 'GO', '21': 'MA',
      '31': 'MG', '50': 'MS', '51': 'MT', '15': 'PA', '25': 'PB',
      '26': 'PE', '22': 'PI', '41': 'PR', '33': 'RJ', '24': 'RN',
      '11': 'RO', '14': 'RR', '43': 'RS', '42': 'SC', '28': 'SE',
      '35': 'SP', '17': 'TO',
    };
    return ufMap[ufCode] || 'SP';
  }

  /**
   * Monta XML de inutilização de CTe
   */
  private buildInutilizationXml(request: InutilizeCteRequest): string {
    const ufCode = this.getUfCode(request.uf);
    const tpAmb = request.environment === 'production' ? '1' : '2';
    const cnpj = request.cnpj.replace(/\D/g, '');
    
    const id = `ID${ufCode}${request.year.toString().slice(-2)}${cnpj}57${request.series.toString().padStart(3, '0')}${request.startNumber.toString().padStart(9, '0')}${request.endNumber.toString().padStart(9, '0')}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<inutCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
  <infInut Id="${id}">
    <tpAmb>${tpAmb}</tpAmb>
    <xServ>INUTILIZAR</xServ>
    <cUF>${ufCode}</cUF>
    <ano>${request.year.toString().slice(-2)}</ano>
    <CNPJ>${cnpj}</CNPJ>
    <mod>57</mod>
    <serie>${request.series}</serie>
    <nCTIni>${request.startNumber}</nCTIni>
    <nCTFin>${request.endNumber}</nCTFin>
    <xJust>${this.escapeXml(request.justification.trim())}</xJust>
  </infInut>
</inutCTe>`;
  }

  /**
   * Retorna código IBGE da UF
   */
  private getUfCode(uf: string): string {
    const codes: Record<string, string> = {
      'AC': '12', 'AL': '27', 'AM': '13', 'AP': '16', 'BA': '29',
      'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
      'MG': '31', 'MS': '50', 'MT': '51', 'PA': '15', 'PB': '25',
      'PE': '26', 'PI': '22', 'PR': '41', 'RJ': '33', 'RN': '24',
      'RO': '11', 'RR': '14', 'RS': '43', 'SC': '42', 'SE': '28',
      'SP': '35', 'TO': '17',
    };
    return codes[uf.toUpperCase()] || '35';
  }

  /**
   * Escapa caracteres especiais para XML
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ========== NFe Methods ==========

  async queryDistribuicaoDFe(request: QueryNfeRequest): Promise<Result<NfeDistribuicaoResponse[], string>> {
    // TODO: E7.9 Semana 2 - Implementar consulta de distribuição DFe
    // Requer implementação no sefaz-client.ts
    return Result.fail(
      'SEFAZ_DFE_NOT_IMPLEMENTED: DFe distribution query requires SEFAZ client extension. ' +
      'Implementation needed: queryDistribuicaoDFe(cnpj, lastNsu, environment)'
    );
  }

  async manifestNfe(request: ManifestNfeRequest): Promise<Result<void, string>> {
    // TODO: E7.9 Semana 2 - Implementar manifestação de NFe
    // Requer implementação no sefaz-client.ts
    return Result.fail(
      'SEFAZ_MANIFEST_NOT_IMPLEMENTED: NFe manifestation requires SEFAZ client extension. ' +
      'Implementation needed: manifestNfe(nfeKey, eventType, justification, environment)'
    );
  }

  /**
   * Baixa NFes da SEFAZ via DistribuicaoDFe
   * E10 Fase 3: Migrado de src/services/sefaz-service.ts SefazService.getDistribuicaoDFe()
   *
   * @param request Dados para consulta incluindo certificado mTLS
   * @returns Response com XML bruto, NSU e contagem de documentos
   */
  async getDistribuicaoDFe(request: DistribuicaoDFeRequest): Promise<Result<DistribuicaoDFeResponse, string>> {
    try {
      logger.info('[SefazGatewayAdapter] Iniciando consulta DistribuicaoDFe na Sefaz');

      // Criar HTTPS Agent com certificado mTLS
      const httpsAgent = new https.Agent({
        pfx: request.certificate.pfx,
        passphrase: request.certificate.password,
        rejectUnauthorized: false, // ⚠️ Em produção, validar certificado da Sefaz
      });

      // Seleciona URL conforme ambiente
      const url =
        request.environment === 'production'
          ? SEFAZ_NFE_DISTRIBUICAO_URLS.PRODUCTION
          : SEFAZ_NFE_DISTRIBUICAO_URLS.HOMOLOGATION;

      logger.info('URL Sefaz', { url });

      // Monta envelope SOAP
      const soapEnvelope = this.buildDistribuicaoEnvelope(
        request.cnpj,
        request.lastNsu,
        request.environment,
        request.uf
      );

      logger.info('Enviando requisicao para Sefaz');

      // Envia requisição SOAP
      const response = await axios.post(url, soapEnvelope, {
        httpsAgent,
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          SOAPAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse',
        },
        timeout: 30000, // 30 segundos
      });

      logger.info('Resposta recebida da Sefaz', { bytes: response.data?.length || 0 });

      // Extrai o XML da resposta
      const responseXml = response.data;

      // Parse para extrair status e NSUs
      const cStatMatch = responseXml.match(/<cStat>(\d+)<\/cStat>/);
      const xMotivoMatch = responseXml.match(/<xMotivo>(.*?)<\/xMotivo>/);
      const ultNSUMatch = responseXml.match(/<ultNSU>(\d+)<\/ultNSU>/);
      const maxNSUMatch = responseXml.match(/<maxNSU>(\d+)<\/maxNSU>/);

      const cStat = cStatMatch ? cStatMatch[1] : null;
      const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Sem motivo';
      const ultNSU = ultNSUMatch ? ultNSUMatch[1] : request.lastNsu;
      const maxNSU = maxNSUMatch ? maxNSUMatch[1] : '000000000000000';

      logger.info('Status SEFAZ', { cStat, xMotivo });
      logger.info('NSU info', { ultNSU, maxNSU });

      // Tratamento de erro 656 (Consumo Indevido)
      if (cStat === '656') {
        logger.warn('ERRO 656 - Consumo Indevido detectado');
        return Result.ok({
          success: false,
          xml: responseXml,
          maxNsu: ultNSU,
          totalDocuments: 0,
          error: {
            code: '656',
            message: xMotivo,
            nextNsu: ultNSU,
            waitMinutes: 60,
          },
        });
      }

      // Status 137: Nenhum documento localizado (normal)
      if (cStat === '137') {
        logger.info('Nenhum documento novo disponivel');
        return Result.ok({
          success: true,
          xml: responseXml,
          maxNsu: ultNSU,
          totalDocuments: 0,
        });
      }

      // Status 138: Documentos localizados
      if (cStat !== '138') {
        logger.warn('Status inesperado', { cStat, xMotivo });
        return Result.ok({
          success: false,
          xml: responseXml,
          maxNsu: ultNSU,
          totalDocuments: 0,
          error: {
            code: cStat || 'unknown',
            message: xMotivo,
          },
        });
      }

      // Conta quantos documentos vieram
      const docZipMatches = responseXml.match(/<docZip/g);
      const totalDocuments = docZipMatches ? docZipMatches.length : 0;

      logger.info('Documentos retornados', { totalDocuments });
      logger.info('Novo maxNSU', { maxNSU });

      return Result.ok({
        success: true,
        xml: responseXml,
        maxNsu: maxNSU,
        totalDocuments,
      });
    } catch (error: unknown) {
      let errorMessage = 'Erro desconhecido';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      logger.error('Erro ao consultar Sefaz', { error: errorMessage });

      // Type guard para Axios error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          logger.error('Resposta Sefaz com erro', { data: axiosError.response.data });
        }
      }

      return Result.fail(`Falha ao comunicar com Sefaz: ${errorMessage}`);
    }
  }

  /**
   * Monta o Envelope SOAP para DistribuicaoDFe
   * E10 Fase 3: Migrado de sefaz-service.ts
   */
  private buildDistribuicaoEnvelope(
    cnpj: string,
    ultNsu: string,
    environment: 'production' | 'homologation',
    uf: string
  ): string {
    // Garante que o CNPJ tenha 14 dígitos (preenche com zeros à esquerda)
    const cnpjPadded = cnpj.padStart(14, '0');

    // Garante que o NSU tenha 15 dígitos (preenche com zeros à esquerda)
    const nsuPadded = ultNsu.padStart(15, '0');

    // Define o tipo de ambiente: 1 = Produção, 2 = Homologação
    const tpAmb = environment === 'production' ? '1' : '2';

    // Código IBGE da UF
    const cUFAutor = UF_TO_IBGE_CODE[uf.toUpperCase()] || '91'; // 91 = Ambiente Nacional (fallback)

    // Limpeza rigorosa dos dados
    const cleanCnpj = cnpjPadded.replace(/\D/g, '');
    const cleanUf = cUFAutor.toString();
    const cleanNsu = nsuPadded.toString().padStart(15, '0');

    // XML Interno (COM A TAG distNSU ADICIONADA - OBRIGATÓRIA!)
    const innerXml = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${cleanUf}</cUFAutor><CNPJ>${cleanCnpj}</CNPJ><distNSU><ultNSU>${cleanNsu}</ultNSU></distNSU></distDFeInt>`;

    // Envelope SOAP MINIFICADO (SEM QUEBRAS DE LINHA)
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg>${innerXml}</nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;

    return soapRequest;
  }

  // ========== MDFe Methods ==========

  async authorizeMdfe(
    mdfeXml: string,
    environment: 'production' | 'homologation'
  ): Promise<Result<AuthorizeMdfeResponse, string>> {
    // TODO: E7.9 Semana 2 - Implementar autorização de MDFe
    // Requer extensão do sefaz-client.ts (similar ao CTe)
    return Result.fail(
      'SEFAZ_MDFE_NOT_IMPLEMENTED: MDFe authorization requires SEFAZ client extension. ' +
      'Implementation needed: sendMdfeToSefaz(mdfeXml, config)'
    );
  }

  async closeMdfe(
    mdfeKey: string,
    environment: 'production' | 'homologation'
  ): Promise<Result<void, string>> {
    // TODO: E7.9 Semana 2 - Implementar encerramento de MDFe
    // Requer extensão do sefaz-client.ts
    return Result.fail(
      'SEFAZ_CLOSE_MDFE_NOT_IMPLEMENTED: MDFe closure requires SEFAZ client extension. ' +
      'Implementation needed: closeMdfeEvent(mdfeKey, environment)'
    );
  }
}
