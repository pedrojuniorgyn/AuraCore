/**
 * Port Output: IActionPlanFollowUpRepository
 * Interface do repositório de follow-ups 3G
 * 
 * @module strategic/domain/ports/output
 */
import type { ActionPlanFollowUp } from '../../entities/ActionPlanFollowUp';

export interface FollowUpFilter {
  actionPlanId: string;
  executionStatus?: string;
  verifiedBy?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface IActionPlanFollowUpRepository {
  /**
   * Busca follow-up por ID
   */
  findById(id: string): Promise<ActionPlanFollowUp | null>;
  
  /**
   * Lista follow-ups de um plano de ação
   */
  findByActionPlanId(actionPlanId: string): Promise<ActionPlanFollowUp[]>;
  
  /**
   * Lista follow-ups com paginação
   */
  findMany(filter: FollowUpFilter): Promise<{
    items: ActionPlanFollowUp[];
    total: number;
  }>;
  
  /**
   * Busca o último follow-up de um plano
   */
  findLastByActionPlanId(actionPlanId: string): Promise<ActionPlanFollowUp | null>;
  
  /**
   * Conta o número de reproposições para um plano
   */
  countRepropositionsByActionPlanId(actionPlanId: string): Promise<number>;
  
  /**
   * Busca follow-ups que geraram reproposição
   */
  findWithRepropositions(actionPlanId: string): Promise<ActionPlanFollowUp[]>;
  
  /**
   * Salva (insert apenas - follow-ups são imutáveis após criação)
   */
  save(entity: ActionPlanFollowUp): Promise<void>;
}
