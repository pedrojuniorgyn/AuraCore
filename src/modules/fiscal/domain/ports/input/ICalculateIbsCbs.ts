/**
 * ICalculateIbsCbs - Input Port (ARCH-010)
 * 
 * Calcula IBS (estadual+municipal) e CBS (federal) para itens de documento fiscal.
 * Reforma Tributária 2026 — EC 132/2023.
 */
import { Result } from '@/shared/domain';
import type { CalculateIbsCbsInput, CalculateIbsCbsOutput } from '../../../application/dtos/CalculateIbsCbsDto';

export interface ExecutionContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

export interface ICalculateIbsCbs {
  execute(
    input: CalculateIbsCbsInput,
    ctx: ExecutionContext
  ): Promise<Result<CalculateIbsCbsOutput, string>>;
}
