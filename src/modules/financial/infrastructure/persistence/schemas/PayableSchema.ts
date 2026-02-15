import { 
  int, 
  varchar, 
  decimal, 
  datetime2, 
  nvarchar,
  char,
  mssqlTable,
  index,
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
  
  // Relacionamentos
  partnerId: int('partner_id'), // FK business_partners (Fornecedor). Mapper traduz → Entity.supplierId
  categoryId: int('category_id'),
  costCenterId: int('cost_center_id'),
  chartAccountId: int('chart_account_id'),
  bankAccountId: int('bank_account_id'),
  fiscalDocumentId: int('fiscal_document_id'),
  
  // Dados do Título
  description: nvarchar('description', { length: 500 }).notNull(),
  documentNumber: nvarchar('document_number', { length: 100 }),
  barcode: nvarchar('barcode', { length: 100 }),
  
  // Datas
  issueDate: datetime2('issue_date'),
  dueDate: datetime2('due_date').notNull(),
  payDate: datetime2('pay_date'),
  discountUntil: datetime2('discount_until'),
  
  // Valores monetários (SCHEMA-007: amount + currency)
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  amountPaid: decimal('amount_paid', { precision: 18, scale: 2 }).default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 2 }),
  discount: decimal('discount', { precision: 18, scale: 2 }).default('0.00'),
  interest: decimal('interest', { precision: 18, scale: 2 }).default('0.00'),
  fine: decimal('fine', { precision: 18, scale: 2 }).default('0.00'),
  
  // Taxas (DDD specific)
  fineRate: decimal('fine_rate', { precision: 5, scale: 2 }).notNull().default('2.00'),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull().default('1.00'),
  
  // Status e Origem
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  origin: nvarchar('origin', { length: 50 }).default('MANUAL'),
  
  notes: nvarchar('notes', { length: 1000 }),
  
  // Controle de versão (optimistic locking)
  version: int('version').notNull().default(1),
  
  // Auditoria (SCHEMA-005)
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  createdBy: nvarchar('created_by', { length: 255 }),
  updatedBy: nvarchar('updated_by', { length: 255 }),
  deletedAt: datetime2('deleted_at'), // SCHEMA-006: Soft delete
}, (table) => ([
  // SCHEMA-003: Índice composto multi-tenancy
  index('idx_ap_tenant').on(table.organizationId, table.branchId),
  // SCHEMA-004: Índices para filtros frequentes
  index('idx_ap_status').on(table.organizationId, table.status),
  index('idx_ap_due_date').on(table.dueDate),
]));

/**
 * Schema para payments (relacionado a accounts_payable)
 * 
 * CORRIGIDO: Adicionado organizationId, branchId, deletedAt (CRITICO-002/003)
 */
export const paymentsTable = mssqlTable('payments', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
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
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto multi-tenancy
  index('idx_payments_tenant').on(table.organizationId, table.branchId),
  // FK index
  index('idx_payments_payable').on(table.payableId),
]));

// Types inferidos
// NOTA: Renomeado para evitar conflito com domain/ports/output/IFinancialTitleRepository
export type AccountPayableRow = typeof accountsPayableTable.$inferSelect;
export type AccountPayableSchemaInsert = typeof accountsPayableTable.$inferInsert;
export type PaymentRow = typeof paymentsTable.$inferSelect;
export type PaymentInsert = typeof paymentsTable.$inferInsert;

// Backward-compat aliases (bare names)
export const accountsPayable = accountsPayableTable;
export const payments = paymentsTable;

