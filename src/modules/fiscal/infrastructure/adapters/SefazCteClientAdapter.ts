/**
 * SefazCteClientAdapter - Infrastructure Adapter
 *
 * Adapta o servico legacy SefazCTeClient para a interface
 * do Domain Port ISefazCteClientService.
 *
 * @see ARCH-011: Implementa interface de domain/ports/output/
 * @see ISefazCteClientService
 * @since E10.3
 */
import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ISefazCteClientService,
  CteAuthorizationResult,
  CteStatusResult,
  CteInutilizationResult,
} from '../../domain/ports/output/ISefazCteClientService';
import { SefazCTeClient } from '@/services/fiscal/sefaz-cte-client';

@injectable()
export class SefazCteClientAdapter implements ISefazCteClientService {
  private readonly client: SefazCTeClient;

  constructor() {
    const uf = process.env.SEFAZ_UF || 'SP';
    const environment: 'production' | 'homologacao' =
      process.env.NODE_ENV === 'production' ? 'production' : 'homologacao';
    this.client = new SefazCTeClient(uf, environment);
  }

  async enviarCte(xmlAssinado: string): Promise<Result<CteAuthorizationResult, string>> {
    try {
      const response = await this.client.enviarCTe(xmlAssinado);

      const result: CteAuthorizationResult = {
        success: response.success,
        protocolNumber: response.numeroProtocolo ?? response.protocolo,
        fiscalKey: response.chaveAcesso,
        status: response.status ?? '000',
        message: response.motivo ?? 'Sem retorno da SEFAZ',
      };

      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao enviar CTe para SEFAZ: ${message}`);
    }
  }

  async consultarCte(chaveAcesso: string): Promise<Result<CteStatusResult, string>> {
    try {
      const response = await this.client.consultarCTe(chaveAcesso);

      const result: CteStatusResult = {
        status: response.status ?? '000',
        protocolNumber: response.protocolo,
        message: response.motivo ?? 'Sem retorno da SEFAZ',
      };

      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao consultar CTe na SEFAZ: ${message}`);
    }
  }

  async cancelarCte(
    chaveAcesso: string,
    protocolo: string,
    justificativa: string,
  ): Promise<Result<CteAuthorizationResult, string>> {
    try {
      const response = await this.client.cancelarCTe(chaveAcesso, protocolo, justificativa);

      const result: CteAuthorizationResult = {
        success: response.success,
        protocolNumber: response.protocolo,
        fiscalKey: chaveAcesso,
        status: response.status ?? '000',
        message: response.motivo ?? 'Sem retorno da SEFAZ',
      };

      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao cancelar CTe na SEFAZ: ${message}`);
    }
  }

  async inutilizarCte(
    serie: string,
    numeroInicial: number,
    numeroFinal: number,
    ano: number,
    justificativa: string,
  ): Promise<Result<CteInutilizationResult, string>> {
    try {
      // Legacy inutilizarCTe expects a pre-signed XML as last param.
      // Build the inutilization XML envelope inline for the legacy client.
      const xmlInut = `
        <inutCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00">
          <infInut>
            <tpAmb>${process.env.NODE_ENV === 'production' ? '1' : '2'}</tpAmb>
            <xServ>INUTILIZAR</xServ>
            <serie>${serie}</serie>
            <nCTIni>${numeroInicial}</nCTIni>
            <nCTFin>${numeroFinal}</nCTFin>
            <ano>${ano}</ano>
            <xJust>${justificativa}</xJust>
          </infInut>
        </inutCTe>
      `.trim();

      const response = await this.client.inutilizarCTe(
        serie,
        numeroInicial,
        numeroFinal,
        ano,
        justificativa,
        xmlInut,
      );

      const result: CteInutilizationResult = {
        success: response.success,
        protocolNumber: response.protocolo,
        message: response.motivo ?? 'Sem retorno da SEFAZ',
      };

      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao inutilizar CTe na SEFAZ: ${message}`);
    }
  }
}
