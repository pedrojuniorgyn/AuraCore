/**
 * IValidateIbsCbsGroup - Input Port (ARCH-010)
 * 
 * Valida grupo de tributação IBS/CBS de um documento fiscal.
 * Verifica campos obrigatórios, alíquotas e CST conforme legislação.
 */
import { Result } from '@/shared/domain';
import type { ValidateIbsCbsGroupInput, ValidateIbsCbsGroupOutput } from '../../../application/dtos/ValidateIbsCbsGroupDto';

export interface ExecutionContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

export interface IValidateIbsCbsGroup {
  execute(
    input: ValidateIbsCbsGroupInput,
    ctx: ExecutionContext
  ): Promise<Result<ValidateIbsCbsGroupOutput, string>>;
}
