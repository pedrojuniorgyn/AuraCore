/**
 * Port Output: IIdeaBoxRepository
 * Interface do repositório do banco de ideias
 * 
 * @module strategic/domain/ports/output
 */
import type { IdeaBox } from '../../entities/IdeaBox';

export interface IdeaBoxFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  sourceType?: string;
  status?: string;
  submittedBy?: string;
  department?: string;
  urgency?: string;
  importance?: string;
  page?: number;
  pageSize?: number;
}

export interface IIdeaBoxRepository {
  /**
   * Busca ideia por ID
   */
  findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<IdeaBox | null>;
  
  /**
   * Lista ideias com paginação
   */
  findMany(filter: IdeaBoxFilter): Promise<{
    items: IdeaBox[];
    total: number;
  }>;
  
  /**
   * Busca ideias pendentes de revisão
   */
  findPendingReview(
    organizationId: number, 
    branchId: number
  ): Promise<IdeaBox[]>;
  
  /**
   * Gera próximo código sequencial
   */
  nextCode(
    organizationId: number, 
    branchId: number
  ): Promise<string>;
  
  /**
   * Salva (insert ou update)
   */
  save(entity: IdeaBox): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void>;
}
