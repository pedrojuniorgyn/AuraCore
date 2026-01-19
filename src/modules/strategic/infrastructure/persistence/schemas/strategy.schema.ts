/**
 * Schema: Strategy (Estratégia)
 * Representa o planejamento estratégico da organização
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';

export const strategyTable = mssqlTable('strategic_strategy', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  name: varchar('name', { length: 200 }).notNull(),
  vision: text('vision'),
  mission: text('mission'),
  values: text('values'), // JSON array
  
  startDate: datetime2('start_date').notNull(),
  endDate: datetime2('end_date').notNull(),
  
  // DRAFT | ACTIVE | REVIEWING | ARCHIVED
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
});

// Índices serão criados via migration:
// CREATE INDEX idx_strategic_strategy_tenant ON strategic_strategy (organization_id, branch_id);
// CREATE INDEX idx_strategic_strategy_status ON strategic_strategy (status);

export type StrategyRow = typeof strategyTable.$inferSelect;
export type StrategyInsert = typeof strategyTable.$inferInsert;
