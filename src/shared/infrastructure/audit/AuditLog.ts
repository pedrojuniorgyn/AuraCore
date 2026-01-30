/**
 * Audit Log Types and Interfaces
 *
 * @module shared/infrastructure/audit
 */

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE';

export interface AuditLogEntry {
  /** ID único do log */
  id: string;

  /** Tipo da entity (ex: 'ActionPlan', 'StrategicGoal') */
  entityType: string;

  /** ID da entity afetada */
  entityId: string;

  /** Operação realizada */
  operation: AuditOperation;

  /** ID do usuário que realizou a operação */
  userId: string;

  /** Nome do usuário (para consulta rápida) */
  userName?: string;

  /** ID da organização */
  organizationId: number;

  /** ID da filial */
  branchId: number;

  /** Timestamp da operação */
  timestamp: Date;

  /** Valores anteriores (para UPDATE/DELETE) */
  previousValues?: Record<string, unknown>;

  /** Valores novos (para INSERT/UPDATE) */
  newValues?: Record<string, unknown>;

  /** Campos alterados (para UPDATE) */
  changedFields?: string[];

  /** IP do cliente (se disponível) */
  clientIp?: string;

  /** User Agent (se disponível) */
  userAgent?: string;

  /** Metadados adicionais */
  metadata?: Record<string, unknown>;
}

export interface AuditContext {
  /** ID do usuário que causou o evento */
  userId: string;

  /** Nome do usuário */
  userName?: string;

  /** ID da organização */
  organizationId: number;

  /** ID da filial */
  branchId: number;

  /** IP do cliente */
  clientIp?: string;

  /** User Agent */
  userAgent?: string;
}
