/**
 * Schema: Anomaly (Anomalia)
 * Desvio não desejado que requer tratamento (Metodologia GEROT/Falconi)
 * Inclui análise de causa raiz com 5 Porquês
 *
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';

export const anomalyTable = mssqlTable('strategic_anomaly', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  code: varchar('code', { length: 30 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),

  // Origem da anomalia
  source: varchar('source', { length: 20 }).notNull(), // CONTROL_ITEM|KPI|MANUAL|AUDIT
  sourceEntityId: varchar('source_entity_id', { length: 36 }),

  // Detecção
  detectedAt: datetime2('detected_at').notNull(),
  detectedBy: varchar('detected_by', { length: 36 }).notNull(),

  // Classificação
  severity: varchar('severity', { length: 20 }).notNull(), // LOW|MEDIUM|HIGH|CRITICAL
  processArea: varchar('process_area', { length: 100 }).notNull(),
  responsibleUserId: varchar('responsible_user_id', { length: 36 }).notNull(),

  // Status: OPEN|ANALYZING|IN_TREATMENT|RESOLVED|CANCELLED
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),

  // Análise de causa raiz (5 Porquês)
  rootCauseAnalysis: text('root_cause_analysis'),
  why1: varchar('why1', { length: 500 }),
  why2: varchar('why2', { length: 500 }),
  why3: varchar('why3', { length: 500 }),
  why4: varchar('why4', { length: 500 }),
  why5: varchar('why5', { length: 500 }),
  rootCause: varchar('root_cause', { length: 500 }),

  // Tratamento
  actionPlanId: varchar('action_plan_id', { length: 36 }),
  standardProcedureId: varchar('standard_procedure_id', { length: 36 }),

  // Resolução
  resolution: text('resolution'),
  resolvedAt: datetime2('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 36 }),

  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_anomaly_tenant').on(table.organizationId, table.branchId),
  // Índices adicionais
  index('idx_anomaly_status').on(table.status),
  index('idx_anomaly_severity').on(table.severity),
  index('idx_anomaly_source').on(table.source),
  index('idx_anomaly_responsible').on(table.responsibleUserId),
]));

export type AnomalyRow = typeof anomalyTable.$inferSelect;
export type AnomalyInsert = typeof anomalyTable.$inferInsert;
