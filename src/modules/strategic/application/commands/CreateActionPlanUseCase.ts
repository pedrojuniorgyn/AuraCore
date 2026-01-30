/**
 * Use Case: CreateActionPlanUseCase
 * Cria plano de ação com metodologia 5W2H
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { ActionPlan, type Priority, type WhoType } from '../../domain/entities/ActionPlan';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface CreateActionPlanInput {
  goalId?: string;
  // 5W2H
  what: string;
  why: string;
  whereLocation?: string;
  whenStart: Date;
  whenEnd: Date;
  who: string;
  whoUserId?: string;
  whoType?: WhoType;
  whoEmail?: string;
  whoPartnerId?: string;
  how: string;
  howMuchAmount?: number;
  howMuchCurrency?: string;
  // Opcional
  priority?: Priority;
}

export interface CreateActionPlanOutput {
  id: string;
  code: string;
  what: string;
  pdcaCycle: string;
}

export interface ICreateActionPlanUseCase {
  execute(
    input: CreateActionPlanInput,
    context: TenantContext
  ): Promise<Result<CreateActionPlanOutput, string>>;
}

@injectable()
export class CreateActionPlanUseCase implements ICreateActionPlanUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository,
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(
    input: CreateActionPlanInput,
    context: TenantContext
  ): Promise<Result<CreateActionPlanOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Validar meta se informada
    if (input.goalId) {
      const goal = await this.goalRepository.findById(
        input.goalId,
        context.organizationId,
        context.branchId
      );
      if (!goal) {
        return Result.fail('Meta não encontrada');
      }
    }

    // 3. Gerar código sequencial
    const code = await this.actionPlanRepository.getNextCode(
      context.organizationId,
      context.branchId
    );

    // 4. Criar plano de ação
    const actionPlanResult = ActionPlan.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      goalId: input.goalId,
      code,
      what: input.what,
      why: input.why,
      whereLocation: input.whereLocation ?? 'N/A',
      whenStart: input.whenStart,
      whenEnd: input.whenEnd,
      who: input.who,
      whoUserId: input.whoUserId,
      whoType: input.whoType,
      whoEmail: input.whoEmail,
      whoPartnerId: input.whoPartnerId,
      how: input.how,
      howMuchAmount: input.howMuchAmount,
      howMuchCurrency: input.howMuchCurrency ?? 'BRL',
      priority: input.priority ?? 'MEDIUM',
      createdBy: context.userId,
    });

    if (Result.isFail(actionPlanResult)) {
      return Result.fail(actionPlanResult.error);
    }

    // 5. Persistir
    await this.actionPlanRepository.save(actionPlanResult.value);

    // 6. Retornar resultado
    return Result.ok({
      id: actionPlanResult.value.id,
      code: actionPlanResult.value.code,
      what: actionPlanResult.value.what,
      pdcaCycle: actionPlanResult.value.pdcaCycle.value,
    });
  }
}
