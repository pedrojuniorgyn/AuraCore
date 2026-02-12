import {
  int,
  varchar,
  char,
  nvarchar,
  datetime2,
  bit,
  index,
  uniqueIndex,
  mssqlTable,
} from 'drizzle-orm/mssql-core';
import { sql } from 'drizzle-orm';

/**
 * Schema: account_determination
 * 
 * Tabela de determinação automática de contas contábeis.
 * Mapeia operationType → (debitAccountId, creditAccountId).
 * Configurável por organização e filial.
 * 
 * Referência SAP: OBYS/OKB9
 * 
 * @see SCHEMA-001 a SCHEMA-010
 * @see SCHEMA-003: Índice composto multi-tenancy
 * @see SCHEMA-010: Índice único para chave natural (org+branch+operationType)
 */
export const accountDeterminationTable = mssqlTable('account_determination', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  // Chave natural
  operationType: varchar('operation_type', { length: 50 }).notNull(),

  // Contas contábeis
  debitAccountId: char('debit_account_id', { length: 36 }).notNull(),
  debitAccountCode: varchar('debit_account_code', { length: 30 }).notNull(),
  creditAccountId: char('credit_account_id', { length: 36 }).notNull(),
  creditAccountCode: varchar('credit_account_code', { length: 30 }).notNull(),

  // Metadata
  description: nvarchar('description', { length: 500 }).notNull(),
  isActive: bit('is_active').notNull().default(true),

  // Auditoria (SCHEMA-005)
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'), // Soft delete (SCHEMA-006)
}, (table) => ([
  // SCHEMA-003: Índice composto multi-tenancy
  index('idx_acct_det_tenant').on(table.organizationId, table.branchId),
  // SCHEMA-010: Índice único para chave natural
  uniqueIndex('idx_acct_det_unique_op').on(
    table.organizationId,
    table.branchId,
    table.operationType
  ),
  // SCHEMA-004: Índice para filtro frequente
  index('idx_acct_det_op_type').on(table.operationType),
]));

// SCHEMA-009: Tipos inferidos
export type AccountDeterminationRow = typeof accountDeterminationTable.$inferSelect;
export type AccountDeterminationInsert = typeof accountDeterminationTable.$inferInsert;
