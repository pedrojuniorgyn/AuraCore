/**
 * Port Output: IOkrRepository
 * Interface do repositório de OKRs
 * 
 * @module strategic/okr/domain/ports/output
 */
import type { OKR, OKRLevel, OKRStatus } from '../../entities/OKR';
import type { Result } from '../../../../../../shared/domain/types/Result';

export interface OkrFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  level?: OKRLevel | OKRLevel[];
  status?: OKRStatus | OKRStatus[];
  ownerId?: string;
  parentId?: string | null; // null = buscar raízes (sem parent)
  periodType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface IOkrRepository {
  /**
   * Busca OKR por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR | null>;

  /**
   * Lista OKRs com filtros e paginação
   */
  findMany(filter: OkrFilter): Promise<{
    items: OKR[];
    total: number;
  }>;

  /**
   * Busca OKRs filhos de um parent
   */
  findByParentId(
    parentId: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]>;

  /**
   * Busca OKRs raízes (sem parent) por nível
   */
  findRootsByLevel(
    level: OKRLevel,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]>;

  /**
   * Busca OKRs de um owner específico
   */
  findByOwnerId(
    ownerId: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]>;

  /**
   * Busca OKRs ativos no período atual
   */
  findActiveInPeriod(
    periodType: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]>;

  /**
   * Salva (insert ou update) um OKR
   */
  save(okr: OKR): Promise<Result<void, string>>;

  /**
   * Soft delete de um OKR
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;

  /**
   * Verifica se OKR existe
   */
  exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean>;

  /**
   * Conta total de OKRs por filtro
   */
  count(filter: Omit<OkrFilter, 'page' | 'pageSize'>): Promise<number>;
}
