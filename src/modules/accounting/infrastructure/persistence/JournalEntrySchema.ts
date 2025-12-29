import { 
  int, 
  varchar, 
  decimal, 
  datetime2, 
  nvarchar,
  char,
  mssqlTable
} from 'drizzle-orm/mssql-core';
import { sql } from 'drizzle-orm';

/**
 * Schema Drizzle para journal_entries
 */
export const journalEntriesTable = mssqlTable('journal_entries', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  entryNumber: nvarchar('entry_number', { length: 50 }).notNull(),
  entryDate: datetime2('entry_date').notNull(),
  
  // Período
  periodYear: int('period_year').notNull(),
  periodMonth: int('period_month').notNull(),
  
  description: nvarchar('description', { length: 500 }).notNull(),
  source: varchar('source', { length: 20 }).notNull(),
  sourceId: char('source_id', { length: 36 }),
  
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  
  // Referências de estorno
  reversedById: char('reversed_by_id', { length: 36 }),
  reversesId: char('reverses_id', { length: 36 }),
  
  // Posting
  postedAt: datetime2('posted_at'),
  postedBy: nvarchar('posted_by', { length: 64 }),
  
  notes: nvarchar('notes', { length: 1000 }),
  
  // Controle
  version: int('version').notNull().default(1),
  
  // Auditoria
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
});

/**
 * Schema para journal_entry_lines
 */
export const journalEntryLinesTable = mssqlTable('journal_entry_lines', {
  id: char('id', { length: 36 }).primaryKey(),
  journalEntryId: char('journal_entry_id', { length: 36 }).notNull(),
  
  accountId: char('account_id', { length: 36 }).notNull(),
  accountCode: nvarchar('account_code', { length: 20 }).notNull(),
  
  entryType: varchar('entry_type', { length: 10 }).notNull(), // DEBIT | CREDIT
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  
  description: nvarchar('description', { length: 200 }),
  costCenterId: int('cost_center_id'),
  businessPartnerId: int('business_partner_id'),
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
});

// Types inferidos
export type JournalEntryRow = typeof journalEntriesTable.$inferSelect;
export type JournalEntryInsert = typeof journalEntriesTable.$inferInsert;
export type JournalEntryLineRow = typeof journalEntryLinesTable.$inferSelect;
export type JournalEntryLineInsert = typeof journalEntryLinesTable.$inferInsert;

