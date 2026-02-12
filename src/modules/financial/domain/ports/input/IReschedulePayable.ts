/**
 * IReschedulePayable - Input Port (ARCH-010) — F2.1
 * 
 * Reagenda (altera vencimento) de um título em aberto.
 */
import { Result } from '@/shared/domain';

export interface ReschedulePayableInput {
  payableId: string;
  newDueDate: string; // ISO date
  reason: string;
}

export interface ReschedulePayableOutput {
  id: string;
  oldDueDate: string;
  newDueDate: string;
}

export interface IReschedulePayable {
  execute(
    input: ReschedulePayableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ReschedulePayableOutput, string>>;
}
