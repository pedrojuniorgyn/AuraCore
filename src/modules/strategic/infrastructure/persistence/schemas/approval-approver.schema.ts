/**
 * Schema: ApprovalApprover
 * Tabela: strategic_approval_approvers
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see SCHEMA-001 a SCHEMA-010
 */
import { sql } from 'drizzle-orm';
import { int, varchar, datetime2, bit, index, mssqlTable } from 'drizzle-orm/mssql-core';

export const approvalApproverTable = mssqlTable(
  'strategic_approval_approvers',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    userId: int('user_id').notNull(),
    role: varchar('role', { length: 50 }), // 'CFO', 'CEO', 'DIRECTOR', 'MANAGER'
    scope: varchar('scope', { length: 20 }).notNull().default(sql`'ALL'`), // 'ALL', 'DEPARTMENT', 'SPECIFIC'
    departmentId: varchar('department_id', { length: 36 }), // Se scope = 'DEPARTMENT'
    isActive: bit('is_active').notNull().default(sql`1`),
    createdBy: varchar('created_by', { length: 36 }),
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
    updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  },
  (table) => [
    // Índice composto obrigatório (SCHEMA-003)
    index('idx_approvers_org_branch_active').on(
      table.organizationId,
      table.branchId,
      table.isActive
    ),
    // Índice para queries por usuário
    index('idx_approvers_user').on(
      table.userId,
      table.organizationId,
      table.branchId
    ),
  ]
);

export type ApprovalApproverRow = typeof approvalApproverTable.$inferSelect;
export type ApprovalApproverInsert = typeof approvalApproverTable.$inferInsert;
