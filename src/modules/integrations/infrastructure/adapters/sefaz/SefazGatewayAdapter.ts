import { injectable, inject } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Result } from '@/shared/domain';
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
} from '../../../domain/ports/output/ISefazGateway';
import type { ISefazClient } from '../../../domain/ports/output/ISefazClient';

/**
 * SefazGatewayAdapter - Implementação real da comunicação com SEFAZ
 *
 * E7.9 Integrações - Semana 2
 * E7-Onda A: Refatorado para usar ISefazClient via DI
 *
 * Delega para ISefazClient (implementado por SefazLegacyClientAdapter) que:
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
