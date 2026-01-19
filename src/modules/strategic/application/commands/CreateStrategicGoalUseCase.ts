/**
 * Use Case: CreateStrategicGoalUseCase
 * Cria um novo objetivo estratégico com validação de cascateamento
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { 
  ICreateStrategicGoalUseCase, 
  CreateStrategicGoalInput, 
  CreateStrategicGoalOutput 
} from '../../domain/ports/input/ICreateStrategicGoalUseCase';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { StrategicGoal } from '../../domain/entities/StrategicGoal';
import { CascadeLevel } from '../../domain/value-objects/CascadeLevel';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class CreateStrategicGoalUseCase implements ICreateStrategicGoalUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(
    input: CreateStrategicGoalInput,
    context: TenantContext
  ): Promise<Result<CreateStrategicGoalOutput, string>> {
    // 1. Validar context
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Validar cascade level
    const cascadeLevelResult = CascadeLevel.fromValue(input.cascadeLevel);
    if (Result.isFail(cascadeLevelResult)) {
      return Result.fail(cascadeLevelResult.error);
    }

    const cascadeLevel = cascadeLevelResult.value;

    // 3. Se tem parent, validar hierarquia de cascateamento
    if (input.parentGoalId) {
      const parentGoal = await this.goalRepository.findById(
        input.parentGoalId,
        context.organizationId,
        context.branchId
      );

      if (!parentGoal) {
        return Result.fail('Meta pai não encontrada');
      }

      // Validar que child é 1 nível abaixo do parent
      if (!parentGoal.cascadeLevel.canCascadeTo(cascadeLevel)) {
        return Result.fail(
          `Não é possível cascatear de ${parentGoal.cascadeLevel.value} para ${input.cascadeLevel}. ` +
          `O nível filho deve ser exatamente um nível abaixo do pai.`
        );
      }
    } else {
      // Meta raiz (sem parent) deve ser nível CEO
      if (cascadeLevel.value !== 'CEO') {
        return Result.fail(
          'Metas sem pai (raiz) devem ser do nível CEO. Use parentGoalId para metas de níveis inferiores.'
        );
      }
    }

    // 4. Criar entity
    const goalResult = StrategicGoal.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      perspectiveId: input.perspectiveId,
      parentGoalId: input.parentGoalId,
      code: input.code,
      description: input.description,
      cascadeLevel,
      targetValue: input.targetValue,
      baselineValue: input.baselineValue,
      unit: input.unit,
      polarity: input.polarity,
      weight: input.weight,
      ownerUserId: input.ownerUserId,
      ownerBranchId: input.ownerBranchId,
      startDate: input.startDate,
      dueDate: input.dueDate,
      createdBy: context.userId,
    });

    if (Result.isFail(goalResult)) {
      return Result.fail(goalResult.error);
    }

    const goal = goalResult.value;

    // 5. Persistir
    await this.goalRepository.save(goal);

    // 6. Retornar output
    return Result.ok({
      id: goal.id,
      code: goal.code,
      description: goal.description,
      cascadeLevel: goal.cascadeLevel.value,
    });
  }
}
