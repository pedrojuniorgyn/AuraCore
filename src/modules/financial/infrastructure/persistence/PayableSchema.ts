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
 * Schema Drizzle para accounts_payable
 * 
 * Nota: Este é o modelo de PERSISTÊNCIA, não o de DOMÍNIO.
 * O Mapper converte entre os dois.
 */
export const accountsPayableTable = mssqlTable('accounts_payable', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  supplierId: int('supplier_id').notNull(),
  documentNumber: nvarchar('document_number', { length: 50 }).notNull(),
  description: nvarchar('description', { length: 500 }).notNull(),
  
  // Valores monetários
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  
  // Datas
  dueDate: datetime2('due_date').notNull(),
  discountUntil: datetime2('discount_until'),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 2 }),
  
  // Taxas
  fineRate: decimal('fine_rate', { precision: 5, scale: 2 }).notNull().default('2.00'),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull().default('1.00'),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  
  // Categorização
  categoryId: int('category_id'),
  costCenterId: int('cost_center_id'),
  notes: nvarchar('notes', { length: 1000 }),
  
  // Controle de versão (optimistic locking)
  version: int('version').notNull().default(1),
  
  // Auditoria
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  createdBy: nvarchar('created_by', { length: 64 }),
  updatedBy: nvarchar('updated_by', { length: 64 }),
  deletedAt: datetime2('deleted_at'),
});

/**
 * Schema para payments (relacionado a accounts_payable)
 */
export const paymentsTable = mssqlTable('payments', {
  id: char('id', { length: 36 }).primaryKey(),
  payableId: char('payable_id', { length: 36 }).notNull(),
  
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  
  method: varchar('method', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  
  bankAccountId: char('bank_account_id', { length: 36 }),
  transactionId: nvarchar('transaction_id', { length: 100 }),
  notes: nvarchar('notes', { length: 500 }),
  
  paidAt: datetime2('paid_at').notNull(),
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
});

// Types inferidos
export type AccountPayableRow = typeof accountsPayableTable.$inferSelect;
export type AccountPayableInsert = typeof accountsPayableTable.$inferInsert;
export type PaymentRow = typeof paymentsTable.$inferSelect;
export type PaymentInsert = typeof paymentsTable.$inferInsert;

