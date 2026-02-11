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
  
  // Relacionamentos
  partnerId: int('partner_id'), // FK business_partners (Cliente). Mapper traduz → Entity.customerId
  categoryId: int('category_id'),
  costCenterId: int('cost_center_id'),
  chartAccountId: int('chart_account_id'),
  bankAccountId: int('bank_account_id'),
  fiscalDocumentId: int('fiscal_document_id'),
  
  // Dados do Título
  description: nvarchar('description', { length: 500 }).notNull(),
  documentNumber: nvarchar('document_number', { length: 100 }),
  
  // Datas
  issueDate: datetime2('issue_date').notNull(),
  dueDate: datetime2('due_date').notNull(),
  receiveDate: datetime2('receive_date'),
  discountUntil: datetime2('discount_until'),
  
  // Valores monetários (SCHEMA-007: amount + currency)
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  amountReceived: decimal('amount_received', { precision: 18, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 2 }),
  discount: decimal('discount', { precision: 18, scale: 2 }).default('0.00'),
  interest: decimal('interest', { precision: 18, scale: 2 }).default('0.00'),
  fine: decimal('fine', { precision: 18, scale: 2 }).default('0.00'),
  
  // Taxas (DDD specific)
  fineRate: decimal('fine_rate', { precision: 5, scale: 2 }).notNull().default('2.00'),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull().default('1.00'),
  
  // Status e Origem
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  origin: varchar('origin', { length: 50 }).notNull().default('MANUAL'),
  
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
  index('idx_ar_tenant').on(table.organizationId, table.branchId),
  // SCHEMA-004: Índices para filtros frequentes
  index('idx_ar_status').on(table.organizationId, table.status),
  index('idx_ar_due_date').on(table.dueDate),
  index('idx_ar_partner').on(table.partnerId),
]));

/**
 * Schema para receivable_receipts (recebimentos vinculados)
 * 
 * CORRIGIDO: Adicionado organizationId, branchId, deletedAt (CRITICO-002/003)
 */
export const receivableReceiptsTable = mssqlTable('receivable_receipts', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
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
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto multi-tenancy
  index('idx_receipts_tenant').on(table.organizationId, table.branchId),
  // FK index
  index('idx_receipts_receivable').on(table.receivableId),
]));

// Types inferidos
export type AccountReceivableRow = typeof accountsReceivableTable.$inferSelect;
export type AccountReceivableInsert = typeof accountsReceivableTable.$inferInsert;
export type ReceivableReceiptRow = typeof receivableReceiptsTable.$inferSelect;
export type ReceivableReceiptInsert = typeof receivableReceiptsTable.$inferInsert;
