/**
 * IGetTaxRates - Input Port (ARCH-010)
 * 
 * Retorna alíquotas vigentes de IBS/CBS por UF e município para uma data.
 */
import { Result } from '@/shared/domain';
import type { GetTaxRatesInput, GetTaxRatesOutput } from '../../../application/dtos/TaxRatesDto';

export interface ExecutionContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

export interface IGetTaxRates {
  execute(
    input: GetTaxRatesInput,
    ctx: ExecutionContext
  ): Promise<Result<GetTaxRatesOutput, string>>;
}
