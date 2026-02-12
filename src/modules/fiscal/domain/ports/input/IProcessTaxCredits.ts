/**
 * IProcessTaxCredits - Input Port (ARCH-010)
 * 
 * Processa créditos fiscais pendentes de PIS/COFINS.
 */
import { Result } from '@/shared/domain';
import type { ProcessTaxCreditsRequest, ProcessTaxCreditsResponse } from '../../../application/commands/fiscal/ProcessTaxCreditsUseCase';

export interface IProcessTaxCredits {
  execute(
    request: ProcessTaxCreditsRequest
  ): Promise<Result<ProcessTaxCreditsResponse, Error>>;
}
