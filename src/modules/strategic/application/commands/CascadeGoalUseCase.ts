/**
 * Use Case: CascadeGoalUseCase
 * Desdobra uma meta para o nível inferior
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { StrategicGoal } from '../../domain/entities/StrategicGoal';
import { CascadeLevel } from '../../domain/value-objects/CascadeLevel';
import { GoalCascadeService } from '../../domain/services/GoalCascadeService';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface CascadeGoalInput {
  parentGoalId: string;
  children: Array<{
    code: string;
    description: string;
    targetValue: number;
    weight: number;
    ownerUserId: string;
    ownerBranchId: number;
    dueDate: Date;
  }>;
}

export interface CascadeGoalOutput {
  parentGoalId: string;
  parentCode: string;
  childrenCreated: Array<{
    id: string;
    code: string;
    cascadeLevel: string;
  }>;
  totalWeight: number;
}

export interface ICascadeGoalUseCase {
  execute(
    input: CascadeGoalInput,
    context: TenantContext
  ): Promise<Result<CascadeGoalOutput, string>>;
}

@injectable()
export class CascadeGoalUseCase implements ICascadeGoalUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(
    input: CascadeGoalInput,
    context: TenantContext
  ): Promise<Result<CascadeGoalOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Buscar meta pai
    const parentGoal = await this.goalRepository.findById(
      input.parentGoalId,
      context.organizationId,
      context.branchId
    );

    if (!parentGoal) {
      return Result.fail('Meta pai não encontrada');
    }

    // 3. Determinar nível dos filhos
    const childLevelResult = parentGoal.cascadeLevel.getChildLevel();
    if (Result.isFail(childLevelResult)) {
      return Result.fail(childLevelResult.error);
    }

    const childLevel = childLevelResult.value;

    // 4. Validar soma dos pesos
    const weightsValidation = GoalCascadeService.validateChildrenWeights(
      input.children.map(c => ({ goalId: '', weight: c.weight }))
    );
    if (Result.isFail(weightsValidation)) {
      return Result.fail(weightsValidation.error);
    }

    // 5. Verificar metas filhas já existentes
    const existingChildren = await this.goalRepository.findByParentId(
      input.parentGoalId,
      context.organizationId,
      context.branchId
    );
    
    const existingWeight = existingChildren.reduce((sum, g) => sum + g.weight, 0);
    const newWeight = input.children.reduce((sum, c) => sum + c.weight, 0);
    
    if (existingWeight + newWeight > 100) {
      return Result.fail(
        `Soma dos pesos (${existingWeight + newWeight}%) excede 100%. ` +
        `Peso já utilizado: ${existingWeight}%. Disponível: ${100 - existingWeight}%.`
      );
    }

    // 6. Criar metas filhas
    const createdChildren: Array<{ id: string; code: string; cascadeLevel: string }> = [];

    for (const childInput of input.children) {
      const childResult = StrategicGoal.create({
        organizationId: context.organizationId,
        branchId: context.branchId,
        perspectiveId: parentGoal.perspectiveId,
        parentGoalId: parentGoal.id,
        code: childInput.code,
        description: childInput.description,
        cascadeLevel: childLevel,
        targetValue: childInput.targetValue,
        unit: parentGoal.unit,
        weight: childInput.weight,
        ownerUserId: childInput.ownerUserId,
        ownerBranchId: childInput.ownerBranchId,
        startDate: parentGoal.startDate,
        dueDate: childInput.dueDate,
        createdBy: context.userId,
      });

      if (Result.isFail(childResult)) {
        return Result.fail(`Erro ao criar meta ${childInput.code}: ${childResult.error}`);
      }

      await this.goalRepository.save(childResult.value);

      createdChildren.push({
        id: childResult.value.id,
        code: childResult.value.code,
        cascadeLevel: childResult.value.cascadeLevel.value,
      });
    }

    return Result.ok({
      parentGoalId: parentGoal.id,
      parentCode: parentGoal.code,
      childrenCreated: createdChildren,
      totalWeight: existingWeight + newWeight,
    });
  }
}
