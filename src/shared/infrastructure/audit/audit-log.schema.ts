/**
 * Schema: Audit Log
 * Tabela para armazenar logs de auditoria
 *
 * @module shared/infrastructure/audit
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';

export const auditLogTable = mssqlTable('shared_audit_log', {
  id: varchar('id', { length: 36 }).primaryKey(),

  // Entity info
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 36 }).notNull(),
  operation: varchar('operation', { length: 20 }).notNull(), // INSERT, UPDATE, DELETE, SOFT_DELETE

  // User info
  userId: varchar('user_id', { length: 36 }).notNull(),
  userName: varchar('user_name', { length: 200 }),

  // Tenant
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  // Timestamp
  timestamp: datetime2('timestamp').notNull().default(sql`GETDATE()`),

  // Values (JSON strings)
  previousValues: text('previous_values'),
  newValues: text('new_values'),
  changedFields: text('changed_fields'),

  // Request info
  clientIp: varchar('client_ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),

  // Extra
  metadata: text('metadata'),
}, (table) => ([
  // Índice para busca por entity
  index('idx_audit_log_entity').on(table.entityType, table.entityId),

  // Índice para busca por tenant + data
  index('idx_audit_log_tenant_time').on(table.organizationId, table.branchId, table.timestamp),

  // Índice para busca por usuário
  index('idx_audit_log_user').on(table.userId, table.timestamp),

  // Índice para busca por operação
  index('idx_audit_log_operation').on(table.operation, table.timestamp),
]));

export type AuditLogRow = typeof auditLogTable.$inferSelect;
export type AuditLogInsert = typeof auditLogTable.$inferInsert;
