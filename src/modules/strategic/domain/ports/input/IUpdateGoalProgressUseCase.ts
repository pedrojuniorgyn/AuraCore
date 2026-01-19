/**
 * Input Port: IUpdateGoalProgressUseCase
 * Interface para atualização de progresso de metas
 * 
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';

export interface UpdateGoalProgressInput {
  goalId: string;
  currentValue: number;
}

export interface UpdateGoalProgressOutput {
  goalId: string;
  code: string;
  previousValue: number;
  currentValue: number;
  progress: number;
  status: string;
}

export interface IUpdateGoalProgressUseCase {
  execute(
    input: UpdateGoalProgressInput,
    context: TenantContext
  ): Promise<Result<UpdateGoalProgressOutput, string>>;
}
