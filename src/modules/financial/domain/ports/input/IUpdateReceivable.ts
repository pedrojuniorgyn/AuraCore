/**
 * IUpdateReceivable - Input Port (ARCH-010) — F2.2
 */
import { Result } from '@/shared/domain';

export interface UpdateReceivableInput {
  receivableId: string;
  description?: string;
  dueDate?: string; // ISO date
  categoryId?: number;
  costCenterId?: number;
  chartAccountId?: number;
  notes?: string;
}

export interface UpdateReceivableOutput {
  id: string;
  updatedFields: string[];
}

export interface IUpdateReceivable {
  execute(
    input: UpdateReceivableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<UpdateReceivableOutput, string>>;
}
