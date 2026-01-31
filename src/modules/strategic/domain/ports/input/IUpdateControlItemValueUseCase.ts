import { Result } from '@/shared/domain';

export interface UpdateControlItemValueInput {
  controlItemId: string;
  value: number;
  measuredAt?: Date;
  notes?: string;
}

export interface UpdateControlItemValueOutput {
  id: string;
  previousValue: number | null;
  newValue: number;
  status: 'NORMAL' | 'WARNING' | 'OUT_OF_RANGE';
  isWithinLimits: boolean;
  isOnTarget: boolean;
}

export interface IUpdateControlItemValueUseCase {
  execute(
    input: UpdateControlItemValueInput,
    organizationId: number,
    branchId: number,
    updatedBy: string
  ): Promise<Result<UpdateControlItemValueOutput, string>>;
}
