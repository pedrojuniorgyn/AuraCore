/**
 * Schema: ApprovalDelegate
 * Tabela: strategic_approval_delegate
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see SCHEMA-001 a SCHEMA-010
 */
import { sql } from 'drizzle-orm';
import { int, varchar, datetime2, bit, index, mssqlTable } from 'drizzle-orm/mssql-core';

export const approvalDelegateTable = mssqlTable(
  'strategic_approval_delegate',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    delegatorUserId: int('delegator_user_id').notNull(),
    delegateUserId: int('delegate_user_id').notNull(),
    startDate: datetime2('start_date').notNull(),
    endDate: datetime2('end_date'),
    isActive: bit('is_active').notNull().default(sql`1`),
    createdBy: varchar('created_by', { length: 36 }),
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
    updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  },
  (table) => [
    // Índice composto obrigatório (SCHEMA-003)
    index('idx_approval_delegate_tenant').on(
      table.organizationId,
      table.branchId
    ),
    // Índice para queries de delegação ativa
    index('idx_delegate_delegator_delegate_active').on(
      table.delegatorUserId,
      table.delegateUserId,
      table.organizationId,
      table.branchId,
      table.isActive
    ),
  ]
);

export type ApprovalDelegateRow = typeof approvalDelegateTable.$inferSelect;
export type ApprovalDelegateInsert = typeof approvalDelegateTable.$inferInsert;
