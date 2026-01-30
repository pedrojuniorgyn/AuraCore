/**
 * Interface: IAuditLogger
 * Interface para logging de auditoria
 *
 * @module shared/infrastructure/audit
 */
import type { AuditLogEntry, AuditOperation, AuditContext } from './AuditLog';

export type { AuditLogEntry, AuditOperation, AuditContext };

export interface IAuditLogger {
  /**
   * Registra uma operação de auditoria
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Registra INSERT de uma entity
   */
  logInsert<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    newValues: T,
    context: AuditContext
  ): Promise<void>;

  /**
   * Registra UPDATE de uma entity
   */
  logUpdate<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    previousValues: T,
    newValues: T,
    context: AuditContext
  ): Promise<void>;

  /**
   * Registra DELETE (soft ou hard) de uma entity
   */
  logDelete<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    previousValues: T,
    context: AuditContext,
    softDelete?: boolean
  ): Promise<void>;

  /**
   * Busca histórico de auditoria de uma entity
   */
  getHistory(
    entityType: string,
    entityId: string,
    limit?: number
  ): Promise<AuditLogEntry[]>;

  /**
   * Busca logs de auditoria por filtros
   */
  search(filters: AuditSearchFilters): Promise<{
    items: AuditLogEntry[];
    total: number;
  }>;
}

export interface AuditSearchFilters {
  organizationId: number;
  branchId: number;
  entityType?: string;
  entityId?: string;
  operation?: AuditOperation;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}
