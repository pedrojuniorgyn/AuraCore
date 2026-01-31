/**
 * Port Input: IListIdeasUseCase
 * Listar ideias do IdeaBox com filtros e paginação
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { IdeaBox } from '../../entities/IdeaBox';

export interface ListIdeasDTO {
  organizationId: number;
  branchId: number;
  sourceType?: string;
  status?: string;
  submittedBy?: string;
  department?: string;
  urgency?: string;
  importance?: string;
  page?: number;
  pageSize?: number;
}

export interface ListIdeasResult {
  items: IdeaBox[];
  total: number;
}

export interface IListIdeasUseCase {
  execute(dto: ListIdeasDTO): Promise<Result<ListIdeasResult, string>>;
}
