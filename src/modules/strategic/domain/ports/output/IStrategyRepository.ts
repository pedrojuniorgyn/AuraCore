/**
 * Port Output: IStrategyRepository
 * Interface do repositório de estratégias
 *
 * @module strategic/domain/ports/output
 */
import type { Strategy, StrategyVersionType } from '../../entities/Strategy';
import type { Result } from '@/shared/domain';

export interface StrategyFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface IStrategyRepository {
  /**
   * Busca estratégia por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Strategy | null>;

  /**
   * Lista estratégias com paginação
   */
  findMany(filter: StrategyFilter): Promise<{
    items: Strategy[];
    total: number;
  }>;

  /**
   * Busca a estratégia ativa
   */
  findActive(
    organizationId: number,
    branchId: number
  ): Promise<Strategy | null>;

  /**
   * Salva (insert ou update)
   */
  save(entity: Strategy): Promise<Result<void, string>>;

  /**
   * Soft delete
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;

  /**
   * Busca versão específica de uma estratégia
   */
  findVersionByType(
    parentId: string,
    versionType: StrategyVersionType,
    orgId: number,
    branchId: number
  ): Promise<Strategy | null>;

  /**
   * Busca todas as versões de uma estratégia
   */
  findAllVersions(
    parentId: string,
    orgId: number,
    branchId: number
  ): Promise<Strategy[]>;
}
