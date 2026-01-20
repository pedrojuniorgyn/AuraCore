/**
 * Adapter para pcg-ncm-classifier legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  IPcgNcmGateway, 
  PcgNcmParams,
  FiscalFlagsResult,
} from '../../domain/ports/output/IPcgNcmGateway';

// Import legado
import { getFiscalFlagsByNcm as legacyGetFiscalFlags } from '@/services/accounting/pcg-ncm-classifier';

@injectable()
export class PcgNcmAdapter implements IPcgNcmGateway {
  async getFiscalFlagsByNcm(params: PcgNcmParams): Promise<Result<FiscalFlagsResult | null, string>> {
    try {
      const result = await legacyGetFiscalFlags(params.ncm, params.organizationId);
      if (!result) {
        return Result.ok(null);
      }
      return Result.ok(result as FiscalFlagsResult);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na busca de flags: ${message}`);
    }
  }
}
