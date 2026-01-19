/**
 * Port Output: IStrategyRepository
 * Interface do repositório de estratégias
 * 
 * @module strategic/domain/ports/output
 */
import type { Strategy } from '../../entities/Strategy';

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
  save(entity: Strategy): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void>;
}
