/**
 * SefazClientAdapter - Infrastructure Adapter (Fiscal Module)
 *
 * Encapsula o legacy sefaz-client.ts e implementa ISefazClientService.
 * Converte throws e raw responses do servico legado em Result pattern.
 *
 * @module fiscal/infrastructure/adapters
 * @see ARCH-011: Implementa interface de domain/ports/output/
 * @since E10.3
 */
import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ISefazClientService,
  SefazTransmissionResult,
  SefazStatusResult,
} from '../../domain/ports/output/ISefazClientService';
import {
  sendCteToSefaz,
  sendMdfeToSefaz,
  checkSefazStatus,
  getDefaultSefazConfig,
} from '@/services/fiscal/sefaz-client';

@injectable()
export class SefazClientAdapter implements ISefazClientService {
  async sendCteToSefaz(cteXml: string, uf: string): Promise<Result<SefazTransmissionResult, string>> {
    try {
      const config = { ...getDefaultSefazConfig(), uf };
      const response = await sendCteToSefaz(cteXml, config);

      const result: SefazTransmissionResult = {
        success: response.success,
        protocolNumber: response.protocolNumber,
        fiscalKey: response.cteKey,
        status: response.success ? '100' : (response.rejectionCode ?? '999'),
        message: response.success
          ? 'CTe autorizado com sucesso'
          : (response.rejectionMessage ?? 'Erro desconhecido'),
      };

      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao enviar CTe para SEFAZ: ${message}`);
    }
  }

  async sendMdfeToSefaz(mdfeXml: string, uf: string): Promise<Result<SefazTransmissionResult, string>> {
    try {
      const config = { ...getDefaultSefazConfig(), uf };
      const response = await sendMdfeToSefaz(mdfeXml, config);

      const result: SefazTransmissionResult = {
        success: response.success,
        protocolNumber: response.protocolNumber,
        fiscalKey: response.mdfeKey,
        status: response.success ? '100' : (response.rejectionCode ?? '999'),
        message: response.success
          ? 'MDFe autorizado com sucesso'
          : (response.rejectionMessage ?? 'Erro desconhecido'),
      };

      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao enviar MDFe para SEFAZ: ${message}`);
    }
  }

  async checkStatus(uf: string): Promise<Result<SefazStatusResult, string>> {
    try {
      const config = { ...getDefaultSefazConfig(), uf };
      const response = await checkSefazStatus(config);

      const result: SefazStatusResult = {
        available: response.online,
        status: response.online ? 'ONLINE' : 'OFFLINE',
        responseTime: response.responseTime ?? 0,
      };

      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao consultar status SEFAZ: ${message}`);
    }
  }
}
