/**
 * IUpdatePayable - Input Port (ARCH-010) — F2.1
 */
import { Result } from '@/shared/domain';

export interface UpdatePayableInput {
  payableId: string;
  description?: string;
  notes?: string;
  categoryId?: number;
  costCenterId?: number;
  supplierId?: number;
}

export interface UpdatePayableOutput {
  id: string;
  updatedFields: string[];
}

export interface IUpdatePayable {
  execute(
    input: UpdatePayableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<UpdatePayableOutput, string>>;
}
