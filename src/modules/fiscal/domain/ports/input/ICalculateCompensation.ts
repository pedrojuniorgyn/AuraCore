/**
 * ICalculateCompensation - Input Port (ARCH-010)
 * 
 * Calcula compensação de tributos entre regime atual (PIS/COFINS)
 * e novo regime (IBS/CBS) durante o período de transição.
 */
import { Result } from '@/shared/domain';
import type { CalculateCompensationInput, CalculateCompensationOutput } from '../../../application/dtos/TaxRatesDto';

export interface ExecutionContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

export interface ICalculateCompensation {
  execute(
    input: CalculateCompensationInput,
    ctx: ExecutionContext
  ): Promise<Result<CalculateCompensationOutput, string>>;
}
