/**
 * Port Output: IActionPlanFollowUpRepository
 * Interface do repositório de follow-ups 3G
 * 
 * @module strategic/domain/ports/output
 * 
 * MULTI-TENANCY: Follow-ups herdam tenancy do ActionPlan pai.
 * Todas as queries DEVEM validar organizationId + branchId via JOIN.
 */
import type { ActionPlanFollowUp } from '../../entities/ActionPlanFollowUp';

/**
 * Filtro para busca de follow-ups
 * OBRIGATÓRIO: organizationId + branchId para garantir isolamento multi-tenant
 */
export interface FollowUpFilter {
  /** Organization ID - OBRIGATÓRIO para multi-tenancy */
  organizationId: number;
  /** Branch ID - OBRIGATÓRIO para multi-tenancy */
  branchId: number;
  /** ID do plano de ação */
  actionPlanId: string;
  /** Status de execução */
  executionStatus?: string;
  /** Verificado por */
  verifiedBy?: string;
  /** Data início */
  fromDate?: Date;
  /** Data fim */
  toDate?: Date;
  /** Página (default: 1) */
  page?: number;
  /** Tamanho da página (default: 20) */
  pageSize?: number;
}

export interface IActionPlanFollowUpRepository {
  /**
   * Gera próximo número de follow-up para um plano
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  getNextFollowUpNumber(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<number>;
  
  /**
   * Busca follow-up por ID com validação multi-tenant
   * @param id ID do follow-up
   * @param organizationId Organization ID para validação
   * @param branchId Branch ID para validação
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp | null>;
  
  /**
   * Lista follow-ups de um plano de ação
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  findByActionPlanId(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp[]>;
  
  /**
   * Lista follow-ups com paginação (filter inclui multi-tenancy)
   */
  findMany(filter: FollowUpFilter): Promise<{
    items: ActionPlanFollowUp[];
    total: number;
  }>;
  
  /**
   * Busca o último follow-up de um plano
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  findLastByActionPlanId(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp | null>;
  
  /**
   * Conta o número de reproposições para um plano
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  countRepropositionsByActionPlanId(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<number>;
  
  /**
   * Busca follow-ups que geraram reproposição
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  findWithRepropositions(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp[]>;
  
  /**
   * Salva (insert apenas - follow-ups são imutáveis após criação)
   */
  save(entity: ActionPlanFollowUp): Promise<void>;
}
