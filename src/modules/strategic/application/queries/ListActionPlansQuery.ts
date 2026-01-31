/**
 * Query: ListActionPlansQuery
 * Listar planos de ação com filtros e paginação
 *
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IListActionPlansUseCase, ListActionPlansDTO, ListActionPlansResult } from '../../domain/ports/input/IListActionPlansUseCase';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ListActionPlansQuery implements IListActionPlansUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly repository: IActionPlanRepository
  ) {}

  async execute(dto: ListActionPlansDTO): Promise<Result<ListActionPlansResult, string>> {
    const result = await this.repository.findMany({
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      goalId: dto.goalId,
      whoUserId: dto.whoUserId,
      pdcaCycle: dto.pdcaCycle,
      status: dto.status,
      priority: dto.priority,
      parentActionPlanId: dto.parentActionPlanId,
      overdueOnly: dto.overdueOnly,
      followUpDueBefore: dto.followUpDueBefore,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });

    return Result.ok(result);
  }
}
