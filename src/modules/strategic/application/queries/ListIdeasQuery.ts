/**
 * Query: ListIdeasQuery
 * Listar ideias do IdeaBox com filtros e paginação
 *
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IListIdeasUseCase, ListIdeasDTO, ListIdeasResult } from '../../domain/ports/input/IListIdeasUseCase';
import type { IIdeaBoxRepository } from '../../domain/ports/output/IIdeaBoxRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ListIdeasQuery implements IListIdeasUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.IdeaBoxRepository)
    private readonly repository: IIdeaBoxRepository
  ) {}

  async execute(dto: ListIdeasDTO): Promise<Result<ListIdeasResult, string>> {
    const result = await this.repository.findMany({
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      sourceType: dto.sourceType,
      status: dto.status,
      submittedBy: dto.submittedBy,
      department: dto.department,
      urgency: dto.urgency,
      importance: dto.importance,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });

    return Result.ok(result);
  }
}
