/**
 * Schema: User Dashboard Layout
 * Preferências de layout do dashboard por usuário
 * 
 * @module strategic/infrastructure/persistence/schemas
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';

export const userDashboardLayoutTable = mssqlTable('strategic_user_dashboard_layout', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  
  // Layout JSON serializado
  layoutJson: text('layout_json').notNull(),
  
  // Auditoria
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_user_dashboard_layout_tenant').on(table.organizationId, table.branchId),
  // Índice único por usuário
  index('idx_user_dashboard_layout_user').on(table.organizationId, table.branchId, table.userId),
]));

export type UserDashboardLayoutRow = typeof userDashboardLayoutTable.$inferSelect;
export type UserDashboardLayoutInsert = typeof userDashboardLayoutTable.$inferInsert;
