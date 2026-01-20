/**
 * Port Output: ISwotAnalysisRepository
 * Interface do repositório de análise SWOT
 * 
 * @module strategic/domain/ports/output
 */
import type { SwotItem, SwotQuadrant, SwotStatus, SwotCategory } from '../../entities/SwotItem';

export interface SwotAnalysisFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  strategyId?: string;
  quadrant?: SwotQuadrant;
  status?: SwotStatus;
  category?: SwotCategory;
  minPriorityScore?: number;
  convertedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ISwotAnalysisRepository {
  /**
   * Busca item SWOT por ID
   */
  findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem | null>;
  
  /**
   * Lista itens SWOT com paginação
   */
  findMany(filter: SwotAnalysisFilter): Promise<{
    items: SwotItem[];
    total: number;
  }>;
  
  /**
   * Busca itens por estratégia
   */
  findByStrategy(
    strategyId: string,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]>;
  
  /**
   * Busca itens por quadrante
   */
  findByQuadrant(
    quadrant: SwotQuadrant,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]>;
  
  /**
   * Busca itens por categoria
   */
  findByCategory(
    category: SwotCategory,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]>;
  
  /**
   * Busca itens de alta prioridade (score >= threshold)
   */
  findHighPriority(
    minPriorityScore: number,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]>;
  
  /**
   * Busca itens não convertidos
   */
  findUnconverted(
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]>;
  
  /**
   * Salva (insert ou update)
   */
  save(entity: SwotItem): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void>;
}
