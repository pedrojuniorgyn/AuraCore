/**
 * Schema: KPI (Key Performance Indicator)
 * Indicadores de desempenho vinculados às metas estratégicas
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, bit, mssqlTable, index } from 'drizzle-orm/mssql-core';
import { strategicGoalTable } from './strategic-goal.schema';

export const kpiTable = mssqlTable('strategic_kpi', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  goalId: varchar('goal_id', { length: 36 })
    .references(() => strategicGoalTable.id),
  
  code: varchar('code', { length: 30 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  // Configuração do indicador
  unit: varchar('unit', { length: 20 }).notNull(),
  polarity: varchar('polarity', { length: 10 }).notNull().default('UP'), // UP | DOWN
  frequency: varchar('frequency', { length: 20 }).notNull().default('MONTHLY'), // DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
  
  // Valores
  targetValue: decimal('target_value', { precision: 18, scale: 4 }).notNull(),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }).notNull().default('0'),
  baselineValue: decimal('baseline_value', { precision: 18, scale: 4 }),
  
  // Thresholds para alertas
  alertThreshold: decimal('alert_threshold', { precision: 5, scale: 2 }).notNull().default('10.00'), // % desvio para warning
  criticalThreshold: decimal('critical_threshold', { precision: 5, scale: 2 }).notNull().default('20.00'), // % desvio para critical
  
  // Integração automática
  autoCalculate: bit('auto_calculate').notNull().default(false),
  sourceModule: varchar('source_module', { length: 50 }), // FINANCIAL | TMS | WMS | null
  sourceQuery: text('source_query'), // Query ou config JSON para cálculo automático
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('GREEN'), // GREEN | YELLOW | RED
  lastCalculatedAt: datetime2('last_calculated_at'),
  
  // Responsável
  ownerUserId: varchar('owner_user_id', { length: 36 }).notNull(),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_kpi_tenant').on(table.organizationId, table.branchId),
  index('idx_kpi_goal').on(table.goalId),
  index('idx_kpi_code').on(table.organizationId, table.branchId, table.code),
  index('idx_kpi_status').on(table.status),
  index('idx_kpi_source').on(table.sourceModule),
]));

export type KPIRow = typeof kpiTable.$inferSelect;
export type KPIInsert = typeof kpiTable.$inferInsert;
