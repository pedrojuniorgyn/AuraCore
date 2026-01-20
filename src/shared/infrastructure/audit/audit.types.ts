/**
 * Audit Trail Types
 * 
 * Tipos e interfaces para o sistema de auditoria do AuraCore.
 * Seguindo padrão de append-only (imutável) para compliance fiscal (5 anos).
 * 
 * @see docs/architecture/runbooks/RUNBOOK_AUDITORIA_V2.md
 */

/**
 * Operações auditáveis
 */
export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Contexto da auditoria - quem/quando/onde
 */
export interface AuditContext {
  /** ID do usuário que realizou a ação */
  userId: string;
  /** Nome do usuário (para histórico) */
  userName?: string;
  /** Organization ID (multi-tenancy) */
  organizationId: number;
  /** Branch ID (multi-tenancy) */
  branchId: number;
  /** IP do cliente */
  ipAddress?: string;
  /** User Agent do navegador */
  userAgent?: string;
  /** ID da requisição (correlação) */
  requestId?: string;
  /** Motivo da alteração (opcional) */
  reason?: string;
}

/**
 * Registro de auditoria
 */
export interface AuditRecord {
  id: string;
  entityId: string;
  entityType: string;
  organizationId: number;
  branchId: number;
  operation: AuditOperation;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[] | null;
  reason: string | null;
  changedBy: string;
  changedByName: string | null;
  changedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;
}

/**
 * Opções de busca de histórico de auditoria
 */
export interface AuditHistoryOptions {
  /** ID da entidade */
  entityId: string;
  /** Tipo de entidade (nome da tabela) */
  entityType: string;
  /** Organization ID */
  organizationId: number;
  /** Branch ID */
  branchId: number;
  /** Limite de registros */
  limit?: number;
  /** Offset para paginação */
  offset?: number;
  /** Filtrar por operação */
  operation?: AuditOperation;
  /** Data inicial */
  dateFrom?: Date;
  /** Data final */
  dateTo?: Date;
  /** Filtrar por usuário */
  changedBy?: string;
}

/**
 * Entidades auditáveis suportadas
 */
export const AUDITABLE_ENTITIES = [
  'fiscal_documents',
  'accounts_payable',
  'accounts_receivable',
  'journal_entries',
  'chart_of_accounts',
  'users',
] as const;

export type AuditableEntity = typeof AUDITABLE_ENTITIES[number];
