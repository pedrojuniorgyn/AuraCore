/**
 * Use Case: ReproposeActionPlanUseCase
 * Cria reproposição de um plano de ação que falhou ou precisa de extensão
 *
 * @module strategic/application/commands
 * @see ADR-0022
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import type { IReproposeActionPlanUseCase } from '../../domain/ports/input/IReproposeActionPlanUseCase';
import type { ReproposeActionPlanInput, ReproposeActionPlanOutput } from '../dtos/ReproposeActionPlanDTO';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ReproposeActionPlanUseCase implements IReproposeActionPlanUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository
  ) {}

  async execute(
    input: ReproposeActionPlanInput,
    context: TenantContext
  ): Promise<Result<ReproposeActionPlanOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Validar input básico
    if (!input.originalPlanId?.trim()) {
      return Result.fail('originalPlanId é obrigatório');
    }
    if (!input.reason?.trim()) {
      return Result.fail('reason é obrigatório');
    }
    if (!input.newWhenEnd) {
      return Result.fail('newWhenEnd é obrigatório');
    }

    // 3. Validar que nova data é futura
    const now = new Date();
    if (input.newWhenEnd <= now) {
      return Result.fail('newWhenEnd deve ser uma data futura');
    }

    // 4. Buscar plano original
    const originalPlan = await this.actionPlanRepository.findById(
      input.originalPlanId,
      context.organizationId,
      context.branchId
    );

    if (!originalPlan) {
      return Result.fail('Plano de ação não encontrado');
    }

    // 5. Verificar se pode repropor (máximo 3)
    if (!originalPlan.canRepropose) {
      return Result.fail(
        `Limite de reproposições atingido. Este plano já foi reproposto ${originalPlan.repropositionNumber} vezes (máximo: 3).`
      );
    }

    // 6. Criar reproposição via método da Entity
    const childPlanResult = originalPlan.repropose({
      reason: input.reason.trim(),
      newWhenEnd: input.newWhenEnd,
      newWhoUserId: input.newWhoUserId,
      newWho: input.newWho,
      createdBy: context.userId,
    });

    if (Result.isFail(childPlanResult)) {
      return Result.fail(childPlanResult.error);
    }

    const childPlan = childPlanResult.value;

    // 7. Persistir o novo plano
    await this.actionPlanRepository.save(childPlan);

    // 8. Retornar resultado
    return Result.ok({
      id: childPlan.id,
      code: childPlan.code,
      repropositionNumber: childPlan.repropositionNumber,
      originalPlanId: originalPlan.id,
    });
  }
}
