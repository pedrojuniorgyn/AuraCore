/**
 * Port: IAnomalyRepository
 * Interface para persistência de Anomaly
 *
 * ⚠️ MULTI-TENANCY: Todos os métodos DEVEM receber organizationId E branchId
 *
 * @module strategic/domain/ports/output
 */
import type { Anomaly, AnomalyStatus, AnomalySeverity, AnomalySource } from '../../entities/Anomaly';
import type { Result } from '@/shared/domain';

export interface AnomalyFilters {
  status?: AnomalyStatus;
  severity?: AnomalySeverity;
  source?: AnomalySource;
  processArea?: string;
  responsibleUserId?: string;
}

export interface IAnomalyRepository {
  /**
   * Busca por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly | null>;

  /**
   * Busca por status
   */
  findByStatus(
    status: AnomalyStatus,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]>;

  /**
   * Busca por severidade
   */
  findBySeverity(
    severity: AnomalySeverity,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]>;

  /**
   * Busca por Item de Controle (source)
   */
  findByControlItem(
    controlItemId: string,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]>;

  /**
   * Busca anomalias abertas (não resolvidas e não canceladas)
   */
  findOpen(
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]>;

  /**
   * Lista com filtros e paginação
   */
  findAll(
    organizationId: number,
    branchId: number,
    filters?: AnomalyFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ items: Anomaly[]; total: number }>;

  /**
   * Conta anomalias por severidade
   */
  countBySeverity(
    organizationId: number,
    branchId: number
  ): Promise<Record<AnomalySeverity, number>>;

  /**
   * Salva (insert ou update)
   */
  save(entity: Anomaly): Promise<Result<void, string>>;

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
