/**
 * Drizzle Schema: department
 * Tabela de departments organizacionais com multi-tenancy
 *
 * @module shared/infrastructure/persistence/schemas
 */
import { sql } from 'drizzle-orm';
import {
  varchar,
  int,
  nvarchar,
  bit,
  datetime2,
  mssqlTable,
  index,
} from 'drizzle-orm/mssql-core';

export const departmentTable = mssqlTable('department', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  code: varchar('code', { length: 20 }).notNull(),
  name: nvarchar('name', { length: 100 }).notNull(),
  description: nvarchar('description', { length: 500 }),

  parentId: varchar('parent_id', { length: 36 }),
  managerUserId: int('manager_user_id'),

  isActive: bit('is_active').notNull().default(true),

  createdAt: datetime2('created_at', { precision: 7 })
    .notNull()
    .default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at', { precision: 7 })
    .notNull()
    .default(sql`GETDATE()`),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
  deletedAt: datetime2('deleted_at', { precision: 7 }),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_department_tenant').on(table.organizationId, table.branchId),
  index('idx_department_code').on(table.organizationId, table.branchId, table.code),
  index('idx_department_active').on(table.organizationId, table.branchId, table.isActive),
]));

export type DepartmentRow = typeof departmentTable.$inferSelect;
export type DepartmentInsert = typeof departmentTable.$inferInsert;
