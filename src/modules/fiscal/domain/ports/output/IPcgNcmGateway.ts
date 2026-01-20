/**
 * Gateway para regras PCG/NCM
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface PcgNcmParams {
  organizationId: number;
  branchId: number;
  ncm: string;
}

export interface FiscalFlagsResult {
  pcgId?: number;
  pcgCode?: string;
  pcgName?: string;
  ncmCode?: string;
  ncmDescription?: string;
  flags?: Record<string, boolean>;
  matchType?: string;
  priority?: number;
}

export interface IPcgNcmGateway {
  getFiscalFlagsByNcm(params: PcgNcmParams): Promise<Result<FiscalFlagsResult | null, string>>;
}
