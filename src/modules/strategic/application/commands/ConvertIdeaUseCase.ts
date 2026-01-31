/**
 * Use Case: ConvertIdeaUseCase
 * Converter ideia aprovada em ActionPlan
 *
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { ActionPlan } from '../../domain/entities/ActionPlan';
import { IdeaStatus } from '../../domain/value-objects/IdeaStatus';
import type { IConvertIdeaUseCase, ConvertIdeaDTO } from '../../domain/ports/input/IConvertIdeaUseCase';
import type { IIdeaBoxRepository } from '../../domain/ports/output/IIdeaBoxRepository';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ConvertIdeaUseCase implements IConvertIdeaUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.IdeaBoxRepository)
    private readonly ideaBoxRepository: IIdeaBoxRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository
  ) {}

  async execute(dto: ConvertIdeaDTO): Promise<Result<ActionPlan, string>> {
    // Buscar ideia
    const idea = await this.ideaBoxRepository.findById(
      dto.ideaId,
      dto.organizationId,
      dto.branchId
    );

    if (!idea) {
      return Result.fail('Ideia não encontrada');
    }

    // Validar que a ideia está aprovada
    if (idea.status.value !== IdeaStatus.APPROVED.value) {
      return Result.fail('Apenas ideias aprovadas podem ser convertidas');
    }

    // Gerar código para o ActionPlan
    const actionPlanCode = await this.actionPlanRepository.getNextCode(
      dto.organizationId,
      dto.branchId
    );

    // Criar ActionPlan baseado na ideia
    const actionPlanResult = ActionPlan.create({
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      goalId: dto.goalId,
      code: actionPlanCode,
      what: idea.title,
      why: idea.description,
      whereLocation: dto.whereLocation,
      whenStart: dto.whenStart,
      whenEnd: dto.whenEnd,
      who: dto.who,
      whoUserId: dto.whoUserId,
      whoType: dto.whoType ?? 'USER',
      whoEmail: dto.whoEmail,
      whoPartnerId: dto.whoPartnerId,
      how: dto.how,
      howMuchAmount: dto.howMuchAmount ?? idea.estimatedCost ?? undefined,
      howMuchCurrency: dto.howMuchCurrency ?? idea.estimatedCostCurrency,
      priority: dto.priority,
      createdBy: dto.convertedBy,
    });

    if (Result.isFail(actionPlanResult)) {
      return actionPlanResult;
    }

    const actionPlan = actionPlanResult.value;

    // Marcar ideia como convertida
    const convertResult = idea.convert('ACTION_PLAN', actionPlan.id);

    if (Result.isFail(convertResult)) {
      return Result.fail(convertResult.error);
    }

    // Persistir ambos
    await Promise.all([
      this.actionPlanRepository.save(actionPlan),
      this.ideaBoxRepository.save(idea),
    ]);

    return Result.ok(actionPlan);
  }
}
