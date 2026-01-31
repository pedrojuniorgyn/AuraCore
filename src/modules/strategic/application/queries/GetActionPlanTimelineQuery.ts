/**
 * Query: GetActionPlanTimelineQuery
 * Obter timeline de planos de ação (Gantt chart data)
 *
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IGetActionPlanTimelineUseCase, GetActionPlanTimelineDTO, GetActionPlanTimelineResult, TimelineItem } from '../../domain/ports/input/IGetActionPlanTimelineUseCase';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class GetActionPlanTimelineQuery implements IGetActionPlanTimelineUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly repository: IActionPlanRepository
  ) {}

  async execute(dto: GetActionPlanTimelineDTO): Promise<Result<GetActionPlanTimelineResult, string>> {
    // Buscar planos
    const result = await this.repository.findMany({
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      goalId: dto.goalId,
      page: 1,
      pageSize: 1000, // Buscar todos para timeline
    });

    // Filtrar por datas se fornecidas
    let plans = result.items;
    if (dto.startDate || dto.endDate) {
      plans = plans.filter((plan) => {
        if (dto.startDate && plan.whenEnd < dto.startDate) return false;
        if (dto.endDate && plan.whenStart > dto.endDate) return false;
        return true;
      });
    }

    // Mapear para timeline items
    const items: TimelineItem[] = plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      what: plan.what,
      who: plan.who,
      whenStart: plan.whenStart,
      whenEnd: plan.whenEnd,
      status: plan.status,
      completionPercent: plan.completionPercent,
      dependencies: plan.parentActionPlanId ? [plan.parentActionPlanId] : undefined,
    }));

    // Calcular summary
    const summary = {
      total: items.length,
      completed: items.filter((i) => i.status === 'COMPLETED').length,
      inProgress: items.filter((i) => i.status === 'IN_PROGRESS').length,
      pending: items.filter((i) => i.status === 'PENDING' || i.status === 'DRAFT').length,
    };

    return Result.ok({ items, summary });
  }
}
