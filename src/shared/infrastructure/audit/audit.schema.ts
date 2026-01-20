/**
 * Audit Trail Schema
 * 
 * Schema genérico para tabelas de auditoria.
 * Cada entidade auditável terá uma tabela {entity}_audit.
 * 
 * Características:
 * - Append-only (imutável)
 * - JSON para valores antigos/novos
 * - Índices otimizados para consultas comuns
 * 
 * NOTA: As tabelas de auditoria são criadas via SQL script (scripts/sql/audit-tables-setup.sql)
 * devido à natureza dinâmica dos nomes. Este arquivo define apenas os tipos TypeScript.
 * 
 * @see docs/architecture/runbooks/RUNBOOK_AUDITORIA_V2.md
 * @see scripts/sql/audit-tables-setup.sql
 */

import { sql } from 'drizzle-orm';
import { varchar, int, datetime2, nvarchar, index } from 'drizzle-orm/mssql-core';
import { mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Tabela de auditoria para documentos fiscais
 * As demais tabelas seguem a mesma estrutura e são criadas via SQL script
 */
export const fiscalDocumentsAudit = mssqlTable(
  'fiscal_documents_audit',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    operation: varchar('operation', { length: 10 }).notNull(),
    oldValues: nvarchar('old_values', { length: 'max' }),
    newValues: nvarchar('new_values', { length: 'max' }),
    changedFields: nvarchar('changed_fields', { length: 'max' }),
    reason: varchar('reason', { length: 500 }),
    changedBy: varchar('changed_by', { length: 36 }).notNull(),
    changedByName: varchar('changed_by_name', { length: 255 }),
    changedAt: datetime2('changed_at').notNull().default(sql`GETDATE()`),
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: varchar('user_agent', { length: 500 }),
    requestId: varchar('request_id', { length: 36 }),
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  },
  (table) => ([
    index('idx_fiscal_documents_audit_entity').on(table.entityId),
    index('idx_fiscal_documents_audit_tenant').on(table.organizationId, table.branchId),
    index('idx_fiscal_documents_audit_date').on(table.changedAt),
    index('idx_fiscal_documents_audit_user').on(table.changedBy),
  ])
);

// Tipos inferidos
export type FiscalDocumentsAuditRow = typeof fiscalDocumentsAudit.$inferSelect;
export type FiscalDocumentsAuditInsert = typeof fiscalDocumentsAudit.$inferInsert;

/**
 * Mapeamento de tabelas de auditoria por entidade
 * NOTA: Todas as tabelas seguem a mesma estrutura, apenas os nomes mudam.
 * Usar SQL direto para as demais (accounts_payable_audit, etc)
 */
export const AUDIT_TABLES = {
  fiscal_documents: 'fiscal_documents_audit',
  accounts_payable: 'accounts_payable_audit',
  accounts_receivable: 'accounts_receivable_audit',
  journal_entries: 'journal_entries_audit',
  chart_of_accounts: 'chart_of_accounts_audit',
  users: 'users_audit',
} as const;

export type AuditTableName = keyof typeof AUDIT_TABLES;
