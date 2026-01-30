/**
 * Port Output: IKPIRepository
 * Interface do repositório de KPIs
 * 
 * @module strategic/domain/ports/output
 */
import type { KPI } from '../../entities/KPI';

export interface KPIFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  goalId?: string;
  ownerUserId?: string;
  status?: string;
  sourceModule?: string;
  autoCalculateOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface IKPIRepository {
  /**
   * Busca KPI por ID
   */
  findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<KPI | null>;
  
  /**
   * Busca KPI por código
   */
  findByCode(
    code: string, 
    organizationId: number, 
    branchId: number
  ): Promise<KPI | null>;
  
  /**
   * Lista KPIs com paginação
   */
  findMany(filter: KPIFilter): Promise<{
    items: KPI[];
    total: number;
  }>;
  
  /**
   * Lista KPIs de uma meta específica
   */
  findByGoalId(
    goalId: string,
    organizationId: number,
    branchId: number
  ): Promise<KPI[]>;

  /**
   * Busca KPIs de múltiplos goals em uma única query (batch)
   * Retorna Map<goalId, KPI[]> para lookup eficiente
   *
   * ⚠️ MULTI-TENANCY: Filtra por organizationId E branchId
   *
   * @param goalIds - Array de IDs de goals
   * @param organizationId - ID da organização (multi-tenancy)
   * @param branchId - ID da filial (multi-tenancy)
   * @returns Map com goalId como chave e array de KPIs como valor
   */
  findByGoalIds(
    goalIds: string[],
    organizationId: number,
    branchId: number
  ): Promise<Map<string, KPI[]>>;

  /**
   * Lista KPIs que precisam de cálculo automático
   */
  findForAutoCalculation(
    organizationId: number, 
    branchId: number
  ): Promise<KPI[]>;
  
  /**
   * Lista KPIs com status crítico (RED)
   */
  findCritical(
    organizationId: number, 
    branchId: number
  ): Promise<KPI[]>;
  
  /**
   * Salva (insert ou update)
   */
  save(entity: KPI): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void>;
}
