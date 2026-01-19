/**
 * Use Case: UpdateGoalProgressUseCase
 * Atualiza progresso de uma meta
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

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

@injectable()
export class UpdateGoalProgressUseCase implements IUpdateGoalProgressUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(
    input: UpdateGoalProgressInput,
    context: TenantContext
  ): Promise<Result<UpdateGoalProgressOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Buscar meta
    const goal = await this.goalRepository.findById(
      input.goalId,
      context.organizationId,
      context.branchId
    );

    if (!goal) {
      return Result.fail('Meta não encontrada');
    }

    // 3. Guardar valor anterior
    const previousValue = goal.currentValue;

    // 4. Atualizar progresso
    const updateResult = goal.updateProgress(input.currentValue);
    if (Result.isFail(updateResult)) {
      return Result.fail(updateResult.error);
    }

    // 5. Persistir
    await this.goalRepository.save(goal);

    // 6. Retornar resultado
    return Result.ok({
      goalId: goal.id,
      code: goal.code,
      previousValue,
      currentValue: goal.currentValue,
      progress: goal.progress,
      status: goal.status.value,
    });
  }
}
