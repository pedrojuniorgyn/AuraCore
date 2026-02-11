import { 
  int, 
  varchar, 
  decimal, 
  datetime2, 
  nvarchar,
  char,
  mssqlTable,
  index
} from 'drizzle-orm/mssql-core';
import { sql } from 'drizzle-orm';

/**
 * Schema Drizzle para accounts_receivable
 * 
 * Nota: Este é o modelo de PERSISTÊNCIA, não o de DOMÍNIO.
 * O Mapper converte entre os dois.
 */
export const accountsReceivableTable = mssqlTable('accounts_receivable', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  customerId: int('customer_id').notNull(),
  documentNumber: nvarchar('document_number', { length: 50 }).notNull(),
  description: nvarchar('description', { length: 500 }).notNull(),
  
  // Valores monetários
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  amountReceived: decimal('amount_received', { precision: 18, scale: 2 }).notNull().default('0'),
  
  // Datas
  issueDate: datetime2('issue_date').notNull(),
  dueDate: datetime2('due_date').notNull(),
  receiveDate: datetime2('receive_date'),
  discountUntil: datetime2('discount_until'),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 2 }),
  
  // Taxas
  fineRate: decimal('fine_rate', { precision: 5, scale: 2 }).notNull().default('2.00'),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull().default('1.00'),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  origin: varchar('origin', { length: 50 }).notNull().default('MANUAL'),
  
  // Categorização
  categoryId: int('category_id'),
  costCenterId: int('cost_center_id'),
  chartAccountId: int('chart_account_id'),
  bankAccountId: int('bank_account_id'),
  fiscalDocumentId: int('fiscal_document_id'),
  notes: nvarchar('notes', { length: 1000 }),
  
  // Controle de versão (optimistic locking)
  version: int('version').notNull().default(1),
  
  // Auditoria
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  createdBy: nvarchar('created_by', { length: 64 }),
  updatedBy: nvarchar('updated_by', { length: 64 }),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // Índice multi-tenancy
  index('idx_accounts_receivable_tenant').on(table.organizationId, table.branchId),
  // Índice por status
  index('idx_accounts_receivable_status').on(table.organizationId, table.status),
  // Índice por vencimento
  index('idx_accounts_receivable_due_date').on(table.dueDate),
  // Índice por cliente
  index('idx_accounts_receivable_customer').on(table.customerId),
]));

/**
 * Schema para receivable_receipts (recebimentos vinculados)
 */
export const receivableReceiptsTable = mssqlTable('receivable_receipts', {
  id: char('id', { length: 36 }).primaryKey(),
  receivableId: char('receivable_id', { length: 36 }).notNull(),
  
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  
  method: varchar('method', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  
  bankAccountId: char('bank_account_id', { length: 36 }),
  transactionId: nvarchar('transaction_id', { length: 100 }),
  notes: nvarchar('notes', { length: 500 }),
  
  receivedAt: datetime2('received_at').notNull(),
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
});

// Types inferidos
export type AccountReceivableRow = typeof accountsReceivableTable.$inferSelect;
export type AccountReceivableInsert = typeof accountsReceivableTable.$inferInsert;
export type ReceivableReceiptRow = typeof receivableReceiptsTable.$inferSelect;
export type ReceivableReceiptInsert = typeof receivableReceiptsTable.$inferInsert;
