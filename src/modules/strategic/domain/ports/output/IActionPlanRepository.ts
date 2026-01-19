/**
 * Port Output: IActionPlanRepository
 * Interface do repositório de planos de ação
 * 
 * @module strategic/domain/ports/output
 */
import type { ActionPlan } from '../../entities/ActionPlan';

export interface ActionPlanFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
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

export interface IActionPlanRepository {
  /**
   * Gera próximo código sequencial de plano de ação
   */
  getNextCode(organizationId: number, branchId: number): Promise<string>;
  
  /**
   * Busca plano por ID
   */
  findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<ActionPlan | null>;
  
  /**
   * Lista planos com paginação
   */
  findMany(filter: ActionPlanFilter): Promise<{
    items: ActionPlan[];
    total: number;
  }>;
  
  /**
   * Busca reproposições de um plano
   */
  findRepropositions(
    originalPlanId: string,
    organizationId: number, 
    branchId: number
  ): Promise<ActionPlan[]>;
  
  /**
   * Busca planos com follow-up pendente
   */
  findPendingFollowUps(
    organizationId: number, 
    branchId: number,
    beforeDate: Date
  ): Promise<ActionPlan[]>;
  
  /**
   * Salva (insert ou update)
   */
  save(entity: ActionPlan): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void>;
}
