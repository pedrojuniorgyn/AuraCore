/**
 * Schema: KPI History
 * Histórico de valores dos KPIs para análise de tendências
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { varchar, decimal, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
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
});

// Índices serão criados via migration:
// CREATE INDEX idx_kpi_history_kpi ON strategic_kpi_history (kpi_id);
// CREATE INDEX idx_kpi_history_period ON strategic_kpi_history (kpi_id, period_date);
// CREATE INDEX idx_kpi_history_date ON strategic_kpi_history (period_date);

export type KPIHistoryRow = typeof kpiHistoryTable.$inferSelect;
export type KPIHistoryInsert = typeof kpiHistoryTable.$inferInsert;
