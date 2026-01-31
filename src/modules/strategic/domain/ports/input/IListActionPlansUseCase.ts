/**
 * Port Input: IListActionPlansUseCase
 * Listar planos de ação com filtros e paginação
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { ActionPlan } from '../../entities/ActionPlan';

export interface ListActionPlansDTO {
  organizationId: number;
  branchId: number;
  goalId?: string;
  whoUserId?: string;
  pdcaCycle?: string;
  status?: string;
  priority?: string;
  parentActionPlanId?: string;
  overdueOnly?: boolean;
  followUpDueBefore?: Date;
  page?: number;
  pageSize?: number;
}

export interface ListActionPlansResult {
  items: ActionPlan[];
  total: number;
}

export interface IListActionPlansUseCase {
  execute(dto: ListActionPlansDTO): Promise<Result<ListActionPlansResult, string>>;
}
