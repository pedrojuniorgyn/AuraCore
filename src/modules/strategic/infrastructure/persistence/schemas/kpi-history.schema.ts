/**
 * Schema: KPI History
 * Histórico de valores dos KPIs para análise de tendências
 *
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { varchar, decimal, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';
import { kpiTable } from './kpi.schema';

export const kpiHistoryTable = mssqlTable('strategic_kpi_history', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  kpiId: varchar('kpi_id', { length: 36 })
    .notNull()
    .references(() => kpiTable.id),
  
  // Período
  periodDate: datetime2('period_date').notNull(), // Data do período (ex: primeiro dia do mês)
  periodType: varchar('period_type', { length: 20 }).notNull(), // DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
  
  // Valores
  value: decimal('value', { precision: 18, scale: 4 }).notNull(),
  targetValue: decimal('target_value', { precision: 18, scale: 4 }).notNull(),
  variance: decimal('variance', { precision: 18, scale: 4 }).notNull(), // Diferença absoluta
  variancePercent: decimal('variance_percent', { precision: 8, scale: 4 }).notNull(), // Diferença percentual
  
  // Status no momento
  status: varchar('status', { length: 20 }).notNull(), // GREEN | YELLOW | RED
  
  // Origem do valor
  sourceType: varchar('source_type', { length: 20 }).notNull(), // MANUAL | AUTO | IMPORT
  sourceUserId: varchar('source_user_id', { length: 36 }),
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
}, (table) => ([
  // Índices para queries de período específico (YTD, MTD, QTD)
  index('idx_kpi_history_kpi').on(table.kpiId),
  index('idx_kpi_history_period_date').on(table.periodDate),
  index('idx_kpi_history_kpi_period').on(table.kpiId, table.periodDate),

  // Índice para queries de período com valor (análise de tendências)
  index('idx_kpi_history_date_range').on(table.kpiId, table.periodDate, table.value),
]));

export type KPIHistoryRow = typeof kpiHistoryTable.$inferSelect;
export type KPIHistoryInsert = typeof kpiHistoryTable.$inferInsert;
