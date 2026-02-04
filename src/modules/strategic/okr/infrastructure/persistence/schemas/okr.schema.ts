/**
 * Schema: OKR (Objectives and Key Results)
 * Tabelas para OKRs e Key Results
 * 
 * @module strategic/okr/infrastructure/persistence/schemas
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, nvarchar } from 'drizzle-orm/mssql-core';
import { mssqlTable, index } from 'drizzle-orm/mssql-core';

/**
 * Tabela principal de OKRs
 */
export const okrTable = mssqlTable('strategic_okr', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // Identification
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  
  // Hierarchy
  level: varchar('level', { length: 20 }).notNull(), // corporate | department | team | individual
  parentId: varchar('parent_id', { length: 36 }),
  
  // Period
  periodType: varchar('period_type', { length: 20 }).notNull(), // quarter | semester | year | custom
  periodLabel: varchar('period_label', { length: 100 }).notNull(),
  startDate: datetime2('start_date').notNull(),
  endDate: datetime2('end_date').notNull(),
  
  // Owner
  ownerId: varchar('owner_id', { length: 36 }).notNull(),
  ownerName: varchar('owner_name', { length: 200 }).notNull(),
  ownerType: varchar('owner_type', { length: 20 }).notNull(), // user | team | department
  
  // Progress & Status
  progress: int('progress').notNull().default(0), // 0-100
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft | active | completed | cancelled
  
  // Multi-tenancy (SCHEMA-003)
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Audit
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_strategic_okr_tenant').on(table.organizationId, table.branchId),
  index('idx_strategic_okr_parent').on(table.parentId),
  index('idx_strategic_okr_level').on(table.level),
  index('idx_strategic_okr_owner').on(table.ownerId),
  index('idx_strategic_okr_status').on(table.status),
  index('idx_strategic_okr_period').on(table.periodType, table.startDate, table.endDate),
]));

/**
 * Tabela de Key Results (1-N com OKRs)
 */
export const okrKeyResultTable = mssqlTable('strategic_okr_key_result', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // Foreign Key
  okrId: varchar('okr_id', { length: 36 }).notNull(),
  
  // Key Result Data
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  metricType: varchar('metric_type', { length: 20 }).notNull(), // number | percentage | currency | boolean
  startValue: int('start_value').notNull(),
  targetValue: int('target_value').notNull(),
  currentValue: int('current_value').notNull().default(0),
  unit: varchar('unit', { length: 50 }),
  status: varchar('status', { length: 20 }).notNull().default('not_started'), // not_started | on_track | at_risk | behind | completed
  weight: int('weight').notNull().default(100), // 0-100 (peso do KR no OKR)
  orderIndex: int('order_index').notNull().default(0), // Ordem de exibição
  
  // Links
  linkedKpiId: varchar('linked_kpi_id', { length: 36 }),
  linkedActionPlanId: varchar('linked_action_plan_id', { length: 36 }),
  
  // Audit
  createdBy: varchar('created_by', { length: 36 }),
  updatedBy: varchar('updated_by', { length: 36 }),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
}, (table) => ([
  index('idx_strategic_okr_key_result_okr').on(table.okrId),
  index('idx_strategic_okr_key_result_status').on(table.status),
]));

export type OkrRow = typeof okrTable.$inferSelect;
export type OkrInsert = typeof okrTable.$inferInsert;
export type KeyResultRow = typeof okrKeyResultTable.$inferSelect;
export type KeyResultInsert = typeof okrKeyResultTable.$inferInsert;
