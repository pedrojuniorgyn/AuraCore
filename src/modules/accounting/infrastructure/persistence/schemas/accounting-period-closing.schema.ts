/**
 * 📋 Accounting Period Closing Schema - Drizzle ORM (SCHEMA-001 a SCHEMA-010)
 * 
 * Registra fechamentos de períodos contábeis.
 * F3.5: Contabilidade - Fechamento de Período
 */
import { sql } from 'drizzle-orm';
import { varchar, int, decimal, datetime2, index, mssqlTable } from 'drizzle-orm/mssql-core';

export const accountingPeriodClosingsTable = mssqlTable(
  'accounting_period_closings',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    periodYear: int('period_year').notNull(),
    periodMonth: int('period_month').notNull(),
    totalEntries: int('total_entries').notNull().default(0),
    totalDebit: decimal('total_debit', { precision: 18, scale: 2 }).notNull().default('0.00'),
    totalCredit: decimal('total_credit', { precision: 18, scale: 2 }).notNull().default('0.00'),
    closedBy: varchar('closed_by', { length: 255 }).notNull(),
    closedAt: datetime2('closed_at').notNull(),
    reopenedAt: datetime2('reopened_at'),
    reopenedBy: varchar('reopened_by', { length: 255 }),
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
    deletedAt: datetime2('deleted_at'),
  },
  (table) => ({
    tenantIdx: index('idx_acct_period_closing_tenant').on(table.organizationId, table.branchId),
    periodIdx: index('idx_acct_period_closing_period').on(
      table.organizationId, table.branchId, table.periodYear, table.periodMonth
    ),
  })
);

export type AccountingPeriodClosingRow = typeof accountingPeriodClosingsTable.$inferSelect;
export type AccountingPeriodClosingInsert = typeof accountingPeriodClosingsTable.$inferInsert;
