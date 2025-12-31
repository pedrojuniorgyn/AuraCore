import { datetime, decimal, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

/**
 * SplitPaymentSchema: Schema Drizzle para persistência de Split Payment
 * 
 * E7.4.1 Semana 10 - Integração Final + E2E Tests
 * 
 * Contexto: Estrutura preparatória para Split Payment (obrigatório a partir de 2027)
 * 
 * Esta tabela armazenará as instruções de split payment geradas para cada documento fiscal,
 * permitindo rastreamento, auditoria e conciliação dos pagamentos divididos.
 * 
 * Referência: EC 132/2023, LC 214/2025
 */

/**
 * Tabela: split_payment_instructions
 * 
 * Armazena as instruções de divisão de pagamento entre os entes tributários
 */
export const splitPaymentInstructions = mysqlTable('split_payment_instructions', {
  // Identificação
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  fiscalDocumentId: varchar('fiscal_document_id', { length: 36 }).notNull(),
  
  // Detalhes do Split
  recipientType: varchar('recipient_type', { length: 20 }).notNull(), // FEDERAL, ESTADUAL, MUNICIPAL
  recipientCode: varchar('recipient_code', { length: 10 }).notNull(), // Código UF ou município
  recipientName: varchar('recipient_name', { length: 200 }).notNull(),
  recipientCnpj: varchar('recipient_cnpj', { length: 14 }).notNull(),
  
  // Tributo
  tributo: varchar('tributo', { length: 20 }).notNull(), // IBS_UF, IBS_MUN, CBS, IS
  
  // Valor (Money)
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  amountCurrency: varchar('amount_currency', { length: 3 }).notNull().default('BRL'),
  
  // Referência
  reference: varchar('reference', { length: 100 }).notNull(), // Número do documento fiscal
  dueDate: datetime('due_date').notNull(),
  
  // Dados bancários (opcional)
  pixKey: varchar('pix_key', { length: 77 }), // Chave PIX (máx 77 caracteres)
  bankCode: varchar('bank_code', { length: 3 }),
  agency: varchar('agency', { length: 10 }),
  account: varchar('account', { length: 20 }),
  accountType: varchar('account_type', { length: 10 }), // CHECKING, SAVINGS
  
  // Código de barras (gerado pela instituição financeira)
  barcode: varchar('barcode', { length: 48 }),
  digitableLine: varchar('digitable_line', { length: 54 }),
  
  // Status do processamento
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, PROCESSING, COMPLETED, FAILED
  processedAt: datetime('processed_at'),
  errorMessage: varchar('error_message', { length: 500 }),
  
  // Auditoria
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
  deletedAt: datetime('deleted_at'),
});

/**
 * Índices recomendados:
 * 
 * - idx_split_payment_org_branch (organization_id, branch_id, deleted_at)
 * - idx_split_payment_fiscal_doc (fiscal_document_id)
 * - idx_split_payment_status (status, processed_at)
 * - idx_split_payment_recipient (recipient_type, recipient_code)
 * - idx_split_payment_due_date (due_date, status)
 * - idx_split_payment_created (created_at)
 * 
 * Migração SQL:
 * 
 * ```sql
 * CREATE INDEX idx_split_payment_org_branch ON split_payment_instructions(organization_id, branch_id, deleted_at);
 * CREATE INDEX idx_split_payment_fiscal_doc ON split_payment_instructions(fiscal_document_id);
 * CREATE INDEX idx_split_payment_status ON split_payment_instructions(status, processed_at);
 * CREATE INDEX idx_split_payment_recipient ON split_payment_instructions(recipient_type, recipient_code);
 * CREATE INDEX idx_split_payment_due_date ON split_payment_instructions(due_date, status);
 * CREATE INDEX idx_split_payment_created ON split_payment_instructions(created_at);
 * ```
 */

