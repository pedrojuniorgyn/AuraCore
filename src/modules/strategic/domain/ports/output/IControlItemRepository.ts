/**
 * Port: IControlItemRepository
 * Interface para persistência de ControlItem
 *
 * ⚠️ MULTI-TENANCY: Todos os métodos DEVEM receber organizationId E branchId
 *
 * @module strategic/domain/ports/output
 */
import type { ControlItem } from '../../entities/ControlItem';
import type { Result } from '@/shared/domain';

export interface ControlItemFilters {
  processArea?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  kpiId?: string;
  responsibleUserId?: string;
}

export interface IControlItemRepository {
  /**
   * Busca por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<ControlItem | null>;

  /**
   * Busca por código único
   */
  findByCode(
    code: string,
    organizationId: number,
    branchId: number
  ): Promise<ControlItem | null>;

  /**
   * Lista com filtros e paginação
   */
  findAll(
    organizationId: number,
    branchId: number,
    filters?: ControlItemFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ items: ControlItem[]; total: number }>;

  /**
   * Busca por KPI vinculado
   */
  findByKpiId(
    kpiId: string,
    organizationId: number,
    branchId: number
  ): Promise<ControlItem[]>;

  /**
   * Busca itens que precisam de medição (baseado na frequência)
   */
  findPendingMeasurement(
    organizationId: number,
    branchId: number
  ): Promise<ControlItem[]>;

  /**
   * Salva (insert ou update)
   */
  save(entity: ControlItem): Promise<Result<void, string>>;

  /**
   * Soft delete
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number,
    deletedBy: string
  ): Promise<Result<void, string>>;
}
