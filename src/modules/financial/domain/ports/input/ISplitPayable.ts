/**
 * ISplitPayable - Input Port (ARCH-010) — F2.1
 * 
 * Divide um título em parcelas. Cancela o original e cria novos payables.
 */
import { Result } from '@/shared/domain';

export interface SplitPayableInput {
  payableId: string;
  installments: Array<{
    dueDate: string; // ISO date
    amount: number;
  }>;
}

export interface SplitPayableOutput {
  cancelledPayableId: string;
  newPayableIds: string[];
  installmentCount: number;
  totalAmount: number;
}

export interface ISplitPayable {
  execute(
    input: SplitPayableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<SplitPayableOutput, string>>;
}
