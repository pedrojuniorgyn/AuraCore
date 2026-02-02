/**
 * Port Output: IAlertRepository
 * Interface do repositório de Alertas
 *
 * @module strategic/domain/ports/output
 */
import type { Alert, AlertType, AlertStatus } from '../../entities/Alert';

export interface AlertFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  status?: AlertStatus;
  alertType?: AlertType;
  severity?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  pageSize?: number;
}

export interface IAlertRepository {
  /**
   * Busca alerta por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Alert | null>;

  /**
   * Busca alerta específico por entidade e tipo
   */
  findByEntity(
    organizationId: number,
    branchId: number,
    entityType: string,
    entityId: string,
    alertType: AlertType
  ): Promise<Alert | null>;

  /**
   * Lista alertas pendentes
   */
  findPending(
    organizationId: number,
    branchId: number
  ): Promise<Alert[]>;

  /**
   * Lista alertas com filtros e paginação
   */
  findMany(filter: AlertFilter): Promise<{
    items: Alert[];
    total: number;
  }>;

  /**
   * Salva um alerta (create ou update)
   */
  save(alert: Alert): Promise<void>;

  /**
   * Deleta um alerta
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;
}
