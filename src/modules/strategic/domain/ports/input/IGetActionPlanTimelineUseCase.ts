/**
 * Port Input: IGetActionPlanTimelineUseCase
 * Obter timeline de planos de ação (Gantt chart data)
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';

export interface TimelineItem {
  id: string;
  code: string;
  what: string;
  who: string;
  whenStart: Date;
  whenEnd: Date;
  status: string;
  completionPercent: number;
  dependencies?: string[];
}

export interface GetActionPlanTimelineDTO {
  organizationId: number;
  branchId: number;
  goalId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GetActionPlanTimelineResult {
  items: TimelineItem[];
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
}

export interface IGetActionPlanTimelineUseCase {
  execute(dto: GetActionPlanTimelineDTO): Promise<Result<GetActionPlanTimelineResult, string>>;
}
