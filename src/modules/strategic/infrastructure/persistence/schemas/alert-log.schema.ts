/**
 * Schema: Alert Log (Log de Alertas)
 * Sistema de alertas automáticos para KPI/Anomaly/Variance/Action Plans
 *
 * @module strategic/infrastructure/persistence/schemas
 * @see SCHEMA-001
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';

export const alertLogTable = mssqlTable('strategic_alert_log', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  // Tipo e severidade do alerta
  alertType: varchar('alert_type', { length: 50 }).notNull(), // KPI_CRITICAL|ANOMALY_HIGH|VARIANCE_UNFAVORABLE|ACTION_PLAN_OVERDUE
  severity: varchar('severity', { length: 20 }).notNull(), // INFO|WARNING|CRITICAL

  // Entidade relacionada
  entityType: varchar('entity_type', { length: 50 }).notNull(), // KPI|ANOMALY|ACTION_PLAN|VARIANCE
  entityId: varchar('entity_id', { length: 36 }).notNull(),
  entityCode: varchar('entity_code', { length: 50 }),
  entityName: varchar('entity_name', { length: 200 }),

  // Conteúdo do alerta
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),

  // Destinatários (JSON arrays)
  notifyUserIds: text('notify_user_ids'), // JSON array de user IDs
  notifyEmails: text('notify_emails'), // JSON array de emails

  // Status do alerta
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING|SENT|ACKNOWLEDGED|RESOLVED
  acknowledgedAt: datetime2('acknowledged_at'),
  acknowledgedBy: varchar('acknowledged_by', { length: 36 }),
  resolvedAt: datetime2('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 36 }),

  // Metadata (JSON com dados adicionais)
  metadata: text('metadata'),

  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_alert_log_tenant').on(table.organizationId, table.branchId),
  // Índices adicionais
  index('idx_alert_log_status').on(table.status),
  index('idx_alert_log_type').on(table.alertType),
  index('idx_alert_log_entity').on(table.entityType, table.entityId),
]));

export type AlertLogRow = typeof alertLogTable.$inferSelect;
export type AlertLogInsert = typeof alertLogTable.$inferInsert;
