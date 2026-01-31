/**
 * Schema: Strategy (Estratégia)
 * Representa o planejamento estratégico da organização
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, bit, mssqlTable, index } from 'drizzle-orm/mssql-core';

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

  // Versioning (Task 04 - Fase 4)
  versionType: varchar('version_type', { length: 20 }).notNull().default('ACTUAL'),
  versionName: varchar('version_name', { length: 100 }),
  parentStrategyId: varchar('parent_strategy_id', { length: 36 }),
  isLocked: bit('is_locked').notNull().default(false),
  lockedAt: datetime2('locked_at'),
  lockedBy: varchar('locked_by', { length: 36 }),

  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_strategic_strategy_tenant').on(table.organizationId, table.branchId),
  index('idx_strategic_strategy_status').on(table.status),
  index('idx_strategy_version').on(table.parentStrategyId, table.versionType),
]));

export type StrategyRow = typeof strategyTable.$inferSelect;
export type StrategyInsert = typeof strategyTable.$inferInsert;
