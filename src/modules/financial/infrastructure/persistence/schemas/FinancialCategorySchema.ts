/**
 * Financial Module - Persistence Schemas (Source of Truth)
 *
 * Definições Drizzle para tabelas do módulo Financial.
 * Estas definições correspondem à estrutura REAL do banco de dados (INT IDs).
 *
 * Convenção de export:
 * - *Table (sufixo): export principal para DDD repositories e mappers
 * - bare name:       alias para rotas V1 e use cases (backward-compat)
 *
 * @module financial/infrastructure/persistence/schemas
 * @see SCHEMA-001 a SCHEMA-010
 */
import {
  int,
  varchar,
  decimal,
  datetime2,
  nvarchar,
  mssqlTable,
} from 'drizzle-orm/mssql-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// CATEGORIAS FINANCEIRAS (Plano de Contas)
// ============================================================================

export const financialCategoriesTable = mssqlTable("financial_categories", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),

  name: nvarchar("name", { length: 255 }).notNull(),
  code: nvarchar("code", { length: 50 }),
  type: nvarchar("type", { length: 20 }).notNull(),
  description: nvarchar("description", { length: "max" }),

  // DFC (Demonstrativo de Fluxo de Caixa)
  codigoEstruturado: nvarchar("codigo_estruturado", { length: 20 }),
  tipoMovimento: nvarchar("tipo_movimento", { length: 20 }),
  grupoDfc: nvarchar("grupo_dfc", { length: 20 }),
  permiteLancamento: int("permite_lancamento").default(1),

  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ============================================================================
// CONTAS BANCÁRIAS
// ============================================================================

export const bankAccountsTable = mssqlTable("bank_accounts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id"),

  name: nvarchar("name", { length: 255 }).notNull(),
  bankCode: nvarchar("bank_code", { length: 10 }),
  bankName: nvarchar("bank_name", { length: 255 }),
  agency: nvarchar("agency", { length: 20 }),
  accountNumber: nvarchar("account_number", { length: 50 }),
  accountDigit: nvarchar("account_digit", { length: 2 }),
  accountType: nvarchar("account_type", { length: 50 }),

  // CNAB
  wallet: nvarchar("wallet", { length: 20 }),
  agreementNumber: nvarchar("agreement_number", { length: 50 }),
  cnabLayout: nvarchar("cnab_layout", { length: 20 }).default("CNAB240"),
  nextRemittanceNumber: int("next_remittance_number").default(1),

  // Saldo
  initialBalance: decimal("initial_balance", { precision: 18, scale: 2 }).default("0.00"),
  currentBalance: decimal("current_balance", { precision: 18, scale: 2 }).default("0.00"),

  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ============================================================================
// CONDIÇÕES DE PAGAMENTO
// ============================================================================

export const paymentTermsTable = mssqlTable("payment_terms", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),

  code: nvarchar("code", { length: 20 }).notNull(),
  name: nvarchar("name", { length: 100 }).notNull(),
  description: nvarchar("description", { length: "max" }),

  installments: int("installments").default(1).notNull(),
  daysInterval: int("days_interval").default(0),
  firstDueDays: int("first_due_days").default(0),

  type: nvarchar("type", { length: 20 }).default("TERM"),
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ============================================================================
// BANK REMITTANCES (Arquivos CNAB)
// ============================================================================

export const bankRemittancesTable = mssqlTable("bank_remittances", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  bankAccountId: int("bank_account_id").notNull(),

  fileName: nvarchar("file_name", { length: 255 }).notNull(),
  content: nvarchar("content", { length: "max" }).notNull(),
  remittanceNumber: int("remittance_number").notNull(),

  type: nvarchar("type", { length: 20 }).notNull(),
  status: nvarchar("status", { length: 50 }).default("GENERATED"),

  totalRecords: int("total_records").default(0),
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).default("0.00"),

  notes: nvarchar("notes", { length: "max" }),
  processedAt: datetime2("processed_at"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ============================================================================
// FINANCIAL DDA INBOX (Débito Direto Autorizado)
// ============================================================================

export const financialDdaInboxTable = mssqlTable("financial_dda_inbox", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  bankAccountId: int("bank_account_id").notNull(),

  externalId: nvarchar("external_id", { length: 255 }).notNull(),
  beneficiaryName: nvarchar("beneficiary_name", { length: 255 }).notNull(),
  beneficiaryDocument: nvarchar("beneficiary_document", { length: 20 }).notNull(),

  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  dueDate: datetime2("due_date").notNull(),
  issueDate: datetime2("issue_date"),

  barcode: nvarchar("barcode", { length: 100 }).notNull(),
  digitableLine: nvarchar("digitable_line", { length: 100 }),

  status: nvarchar("status", { length: 20 }).default("PENDING"),
  matchedPayableId: int("matched_payable_id"),
  matchScore: int("match_score").default(0),

  notes: nvarchar("notes", { length: "max" }),
  dismissedReason: nvarchar("dismissed_reason", { length: 255 }),

  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ============================================================================
// TAX CREDITS (Créditos Tributários)
// ============================================================================

export const taxCreditsTable = mssqlTable("tax_credits", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  invoiceId: int("invoice_id").notNull(),
  taxType: nvarchar("tax_type", { length: 20 }).notNull(),
  taxBase: decimal("tax_base", { precision: 18, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  taxValue: decimal("tax_value", { precision: 18, scale: 2 }).notNull(),
  isRecoverable: nvarchar("is_recoverable", { length: 1 }).default("S"),
  recoverabilityReason: nvarchar("recoverability_reason", { length: 500 }),
  recoveredAt: datetime2("recovered_at"),
  recoveredInPeriod: nvarchar("recovered_in_period", { length: 7 }),
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ============================================================================
// BILLING INVOICES (Faturas de Cobrança)
// ============================================================================

export const billingInvoicesTable = mssqlTable("billing_invoices", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),

  invoiceNumber: nvarchar("invoice_number", { length: 50 }).notNull(),
  customerId: int("customer_id").notNull(),

  periodStart: datetime2("period_start").notNull(),
  periodEnd: datetime2("period_end").notNull(),
  billingFrequency: nvarchar("billing_frequency", { length: 20 }).notNull(),

  totalCtes: int("total_ctes").notNull(),
  grossValue: decimal("gross_value", { precision: 18, scale: 2 }).notNull(),
  discountValue: decimal("discount_value", { precision: 18, scale: 2 }).default("0.00"),
  netValue: decimal("net_value", { precision: 18, scale: 2 }).notNull(),

  issueDate: datetime2("issue_date").notNull(),
  dueDate: datetime2("due_date").notNull(),

  status: nvarchar("status", { length: 20 }).notNull().default("DRAFT"),
  accountsReceivableId: int("accounts_receivable_id"),

  barcodeNumber: nvarchar("barcode_number", { length: 54 }),
  pixKey: nvarchar("pix_key", { length: 500 }),
  pdfUrl: nvarchar("pdf_url", { length: 500 }),

  sentAt: datetime2("sent_at"),
  sentTo: nvarchar("sent_to", { length: 255 }),
  notes: nvarchar("notes", { length: "max" }),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ============================================================================
// BILLING ITEMS (Itens de Fatura)
// ============================================================================

export const billingItemsTable = mssqlTable("billing_items", {
  id: int("id").primaryKey().identity(),

  billingInvoiceId: int("billing_invoice_id").notNull(),
  cteId: int("cte_id").notNull(),

  cteNumber: int("cte_number").notNull(),
  cteSeries: nvarchar("cte_series", { length: 3 }),
  cteKey: nvarchar("cte_key", { length: 44 }),
  cteIssueDate: datetime2("cte_issue_date").notNull(),
  cteValue: decimal("cte_value", { precision: 18, scale: 2 }).notNull(),

  originUf: nvarchar("origin_uf", { length: 2 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }),

  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// ============================================================================
// BTG BOLETOS
// ============================================================================

export const btgBoletosTable = mssqlTable("btg_boletos", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),

  nossoNumero: nvarchar("nosso_numero", { length: 20 }).notNull(),
  seuNumero: nvarchar("seu_numero", { length: 20 }),

  customerId: int("customer_id"),
  payerName: nvarchar("payer_name", { length: 255 }).notNull(),
  payerDocument: nvarchar("payer_document", { length: 18 }).notNull(),

  valorNominal: decimal("valor_nominal", { precision: 18, scale: 2 }).notNull(),
  valorDesconto: decimal("valor_desconto", { precision: 18, scale: 2 }),
  valorMulta: decimal("valor_multa", { precision: 18, scale: 2 }),
  valorJuros: decimal("valor_juros", { precision: 18, scale: 2 }),
  valorPago: decimal("valor_pago", { precision: 18, scale: 2 }),

  dataEmissao: datetime2("data_emissao").notNull(),
  dataVencimento: datetime2("data_vencimento").notNull(),
  dataPagamento: datetime2("data_pagamento"),

  status: nvarchar("status", { length: 20 }).default("PENDING"),

  btgId: nvarchar("btg_id", { length: 50 }),
  linhaDigitavel: nvarchar("linha_digitavel", { length: 100 }),
  codigoBarras: nvarchar("codigo_barras", { length: 100 }),
  pdfUrl: nvarchar("pdf_url", { length: 500 }),

  accountsReceivableId: int("accounts_receivable_id"),
  billingInvoiceId: int("billing_invoice_id"),

  webhookReceivedAt: datetime2("webhook_received_at"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// ============================================================================
// BTG PAYMENTS (Pix/TED/DOC)
// ============================================================================

export const btgPaymentsTable = mssqlTable("btg_payments", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),

  paymentType: nvarchar("payment_type", { length: 10 }).notNull(),

  beneficiaryName: nvarchar("beneficiary_name", { length: 255 }).notNull(),
  beneficiaryDocument: nvarchar("beneficiary_document", { length: 18 }).notNull(),
  beneficiaryBank: nvarchar("beneficiary_bank", { length: 10 }),
  beneficiaryAgency: nvarchar("beneficiary_agency", { length: 10 }),
  beneficiaryAccount: nvarchar("beneficiary_account", { length: 20 }),
  beneficiaryPixKey: nvarchar("beneficiary_pix_key", { length: 100 }),

  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),

  status: nvarchar("status", { length: 20 }).default("PENDING"),
  btgTransactionId: nvarchar("btg_transaction_id", { length: 50 }),
  errorMessage: nvarchar("error_message", { length: 500 }),

  scheduledDate: datetime2("scheduled_date"),
  processedAt: datetime2("processed_at"),

  accountsPayableId: int("accounts_payable_id"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// ============================================================================
// ALIASES (backward-compat para rotas V1 e use cases)
// ============================================================================

export const financialCategories = financialCategoriesTable;
export const bankAccounts = bankAccountsTable;
export const paymentTerms = paymentTermsTable;
export const bankRemittances = bankRemittancesTable;
export const financialDdaInbox = financialDdaInboxTable;
export const taxCredits = taxCreditsTable;
export const billingInvoices = billingInvoicesTable;
export const billingItems = billingItemsTable;
export const btgBoletos = btgBoletosTable;
export const btgPayments = btgPaymentsTable;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FinancialCategorySelect = typeof financialCategoriesTable.$inferSelect;
export type FinancialCategoryInsert = typeof financialCategoriesTable.$inferInsert;

export type BankAccountSelect = typeof bankAccountsTable.$inferSelect;
export type BankAccountInsert = typeof bankAccountsTable.$inferInsert;

export type PaymentTermsSelect = typeof paymentTermsTable.$inferSelect;
export type PaymentTermsInsert = typeof paymentTermsTable.$inferInsert;

export type BankRemittanceSelect = typeof bankRemittancesTable.$inferSelect;
export type BankRemittanceInsert = typeof bankRemittancesTable.$inferInsert;

export type FinancialDdaInboxSelect = typeof financialDdaInboxTable.$inferSelect;
export type FinancialDdaInboxInsert = typeof financialDdaInboxTable.$inferInsert;

export type TaxCreditSelect = typeof taxCreditsTable.$inferSelect;
export type TaxCreditInsert = typeof taxCreditsTable.$inferInsert;

export type BillingInvoiceSelect = typeof billingInvoicesTable.$inferSelect;
export type BillingInvoiceInsert = typeof billingInvoicesTable.$inferInsert;

export type BillingItemSelect = typeof billingItemsTable.$inferSelect;
export type BillingItemInsert = typeof billingItemsTable.$inferInsert;

export type BtgBoletoSelect = typeof btgBoletosTable.$inferSelect;
export type BtgBoletoInsert = typeof btgBoletosTable.$inferInsert;

export type BtgPaymentSelect = typeof btgPaymentsTable.$inferSelect;
export type BtgPaymentInsert = typeof btgPaymentsTable.$inferInsert;
