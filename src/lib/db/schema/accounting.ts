/**
 * 📊 ACCOUNTING SCHEMA - Estrutura Contábil do Aura Core
 * 
 * Implementa o padrão Fiscal → Contábil → Financeiro
 * conforme benchmarks de Totvs, SAP e Oracle NetSuite
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  varchar,
  decimal,
  datetime,
  text,
  int,
  bit,
} from "drizzle-orm/mssql-core";
import { sqlServerTable } from "./base";

/**
 * 🗂️ FISCAL DOCUMENTS (Unificada)
 * 
 * Centraliza TODOS os documentos fiscais e não-fiscais:
 * - NFe (entrada)
 * - CTe (saída)
 * - NFSe
 * - Recibos
 * - Notas Manuais
 */
export const fiscalDocuments = sqlServerTable("fiscal_documents", {
  id: bigint("id", { mode: "number" }).primaryKey().identity(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull(),
  branchId: bigint("branch_id", { mode: "number" }).notNull(),
  
  // Tipo e Identificação
  documentType: varchar("document_type", { length: 20 }).notNull(), // NFE, CTE, NFSE, RECEIPT, MANUAL
  documentNumber: varchar("document_number", { length: 50 }).notNull(),
  documentSeries: varchar("document_series", { length: 10 }),
  accessKey: varchar("access_key", { length: 44 }), // 44 dígitos para NFe/CTe
  
  // Parceiro (Fornecedor/Cliente)
  partnerId: bigint("partner_id", { mode: "number" }),
  partnerDocument: varchar("partner_document", { length: 18 }),
  partnerName: varchar("partner_name", { length: 200 }),
  
  // Datas
  issueDate: datetime("issue_date").notNull(),
  entryDate: datetime("entry_date"), // Data de entrada (para NFe)
  dueDate: datetime("due_date"), // Vencimento
  
  // Valores
  grossAmount: decimal("gross_amount", { precision: 18, scale: 2 }).notNull(), // Valor bruto
  taxAmount: decimal("tax_amount", { precision: 18, scale: 2 }).default(sql`0.00`), // Total impostos
  netAmount: decimal("net_amount", { precision: 18, scale: 2 }).notNull(), // Valor líquido
  
  // Classificação Fiscal
  fiscalClassification: varchar("fiscal_classification", { length: 50 }), // PURCHASE, SALE, CARGO, RETURN, OTHER
  cfop: varchar("cfop", { length: 4 }),
  operationType: varchar("operation_type", { length: 20 }), // ENTRADA, SAIDA
  
  // Status Triple (Fiscal → Contábil → Financeiro)
  fiscalStatus: varchar("fiscal_status", { length: 30 }).notNull().default("IMPORTED"), 
  // IMPORTED, PENDING_CLASSIFICATION, CLASSIFIED, REJECTED
  
  accountingStatus: varchar("accounting_status", { length: 30 }).notNull().default("PENDING"),
  // PENDING, CLASSIFIED, POSTED, REVERSED
  
  financialStatus: varchar("financial_status", { length: 30 }).notNull().default("NO_TITLE"),
  // NO_TITLE, GENERATED, PARTIAL, PAID
  
  // Rastreabilidade
  journalEntryId: bigint("journal_entry_id", { mode: "number" }), // FK para lançamento contábil
  
  // XML/PDF
  xmlContent: text("xml_content"), // XML completo (se NFe/CTe)
  xmlHash: varchar("xml_hash", { length: 64 }), // Hash SHA-256 para duplicação
  pdfUrl: varchar("pdf_url", { length: 500 }), // URL do PDF anexo
  
  // Observações
  notes: text("notes"),
  internalNotes: text("internal_notes"), // Notas internas (não impressas)
  
  // Controle
  editable: bit("editable").notNull().default(sql`1`), // Permite edição
  importedFrom: varchar("imported_from", { length: 50 }), // SEFAZ, MANUAL, API
  
  // Auditoria
  postedAt: datetime("posted_at"), // Data de contabilização
  postedBy: bigint("posted_by", { mode: "number" }), // Usuário que contabilizou
  reversedAt: datetime("reversed_at"), // Data de reversão
  reversedBy: bigint("reversed_by", { mode: "number" }), // Usuário que reverteu
  
  createdAt: datetime("created_at").notNull().default(sql`GETDATE()`),
  updatedAt: datetime("updated_at").notNull().default(sql`GETDATE()`),
  deletedAt: datetime("deleted_at"),
  createdBy: bigint("created_by", { mode: "number" }).notNull(),
  updatedBy: bigint("updated_by", { mode: "number" }).notNull(),
  version: int("version").notNull().default(1),
});

/**
 * 📦 FISCAL DOCUMENT ITEMS (Itens dos Documentos)
 * 
 * Detalhamento por item/produto de cada documento fiscal
 */
export const fiscalDocumentItems = sqlServerTable("fiscal_document_items", {
  id: bigint("id", { mode: "number" }).primaryKey().identity(),
  fiscalDocumentId: bigint("fiscal_document_id", { mode: "number" }).notNull(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull(),
  
  // Identificação do Item
  itemNumber: int("item_number").notNull(), // Número sequencial do item
  productId: bigint("product_id", { mode: "number" }), // FK para products
  ncmCode: varchar("ncm_code", { length: 10 }),
  
  // Descrição
  description: varchar("description", { length: 500 }).notNull(),
  additionalInfo: text("additional_info"),
  
  // Quantidades
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(), // UN, KG, LT, etc.
  unitPrice: decimal("unit_price", { precision: 18, scale: 6 }).notNull(),
  
  // Valores
  grossAmount: decimal("gross_amount", { precision: 18, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 18, scale: 2 }).default(sql`0.00`),
  netAmount: decimal("net_amount", { precision: 18, scale: 2 }).notNull(),
  
  // Impostos (detalhado)
  icmsAmount: decimal("icms_amount", { precision: 18, scale: 2 }).default(sql`0.00`),
  icmsRate: decimal("icms_rate", { precision: 5, scale: 2 }).default(sql`0.00`),
  ipiAmount: decimal("ipi_amount", { precision: 18, scale: 2 }).default(sql`0.00`),
  ipiRate: decimal("ipi_rate", { precision: 5, scale: 2 }).default(sql`0.00`),
  pisAmount: decimal("pis_amount", { precision: 18, scale: 2 }).default(sql`0.00`),
  pisRate: decimal("pis_rate", { precision: 5, scale: 2 }).default(sql`0.00`),
  cofinsAmount: decimal("cofins_amount", { precision: 18, scale: 2 }).default(sql`0.00`),
  cofinsRate: decimal("cofins_rate", { precision: 5, scale: 2 }).default(sql`0.00`),
  
  // Classificação Fiscal
  cfop: varchar("cfop", { length: 4 }),
  cstIcms: varchar("cst_icms", { length: 3 }),
  cstPis: varchar("cst_pis", { length: 2 }),
  cstCofins: varchar("cst_cofins", { length: 2 }),
  
  // Classificação Contábil (Editável)
  chartAccountId: bigint("chart_account_id", { mode: "number" }), // FK para chart_of_accounts
  categoryId: bigint("category_id", { mode: "number" }), // FK para financial_categories
  costCenterId: bigint("cost_center_id", { mode: "number" }), // FK para cost_centers
  
  // Auditoria
  createdAt: datetime("created_at").notNull().default(sql`GETDATE()`),
  updatedAt: datetime("updated_at").notNull().default(sql`GETDATE()`),
  deletedAt: datetime("deleted_at"),
  version: int("version").notNull().default(1),
});

/**
 * 📚 JOURNAL ENTRIES (Lançamentos Contábeis)
 * 
 * Cabeçalho dos lançamentos contábeis
 */
export const journalEntries = sqlServerTable("journal_entries", {
  id: bigint("id", { mode: "number" }).primaryKey().identity(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull(),
  branchId: bigint("branch_id", { mode: "number" }).notNull(),
  
  // Identificação
  entryNumber: varchar("entry_number", { length: 20 }).notNull(), // Número sequencial do lançamento
  entryDate: datetime("entry_date").notNull(), // Data do lançamento
  
  // Origem
  sourceType: varchar("source_type", { length: 30 }).notNull(), 
  // FISCAL_DOC, PAYMENT, RECEIPT, MANUAL, ADJUSTMENT, DEPRECIATION
  sourceId: bigint("source_id", { mode: "number" }), // ID da origem (fiscal_document_id, payment_id, etc.)
  
  // Descrição
  description: varchar("description", { length: 500 }).notNull(),
  notes: text("notes"),
  
  // Valores
  totalDebit: decimal("total_debit", { precision: 18, scale: 2 }).notNull(),
  totalCredit: decimal("total_credit", { precision: 18, scale: 2 }).notNull(),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("DRAFT"),
  // DRAFT, POSTED, REVERSED
  
  // Tipo de Livro (Futuro: Multi-Book)
  bookType: varchar("book_type", { length: 20 }).notNull().default("GENERAL"),
  // GENERAL, TAX, IFRS, MANAGEMENT
  
  // Reversão
  reversedBy: bigint("reversed_by_entry_id", { mode: "number" }), // FK para journal_entry que reverteu
  reversalOf: bigint("reversal_of_entry_id", { mode: "number" }), // FK para journal_entry original (se for reversão)
  
  // Auditoria
  postedAt: datetime("posted_at"),
  postedBy: bigint("posted_by", { mode: "number" }),
  reversedAt: datetime("reversed_at"),
  reversedByUser: bigint("reversed_by_user", { mode: "number" }),
  
  createdAt: datetime("created_at").notNull().default(sql`GETDATE()`),
  updatedAt: datetime("updated_at").notNull().default(sql`GETDATE()`),
  deletedAt: datetime("deleted_at"),
  createdBy: bigint("created_by", { mode: "number" }).notNull(),
  updatedBy: bigint("updated_by", { mode: "number" }).notNull(),
  version: int("version").notNull().default(1),
});

/**
 * 📝 JOURNAL ENTRY LINES (Linhas dos Lançamentos)
 * 
 * Partidas dobradas (débito/crédito)
 */
export const journalEntryLines = sqlServerTable("journal_entry_lines", {
  id: bigint("id", { mode: "number" }).primaryKey().identity(),
  journalEntryId: bigint("journal_entry_id", { mode: "number" }).notNull(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull(),
  
  // Linha
  lineNumber: int("line_number").notNull(), // Número sequencial da linha
  
  // Conta Contábil
  chartAccountId: bigint("chart_account_id", { mode: "number" }).notNull(),
  
  // Valores (SEMPRE um dos dois é 0)
  debitAmount: decimal("debit_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`),
  creditAmount: decimal("credit_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`),
  
  // Dimensões Contábeis
  costCenterId: bigint("cost_center_id", { mode: "number" }), // Centro de Custo
  categoryId: bigint("category_id", { mode: "number" }), // Categoria Financeira
  partnerId: bigint("partner_id", { mode: "number" }), // Fornecedor/Cliente
  projectId: bigint("project_id", { mode: "number" }), // Projeto (futuro)
  
  // Descrição
  description: varchar("description", { length: 500 }),
  notes: text("notes"),
  
  // Auditoria
  createdAt: datetime("created_at").notNull().default(sql`GETDATE()`),
  updatedAt: datetime("updated_at").notNull().default(sql`GETDATE()`),
  version: int("version").notNull().default(1),
});

/**
 * 💰 FINANCIAL TRANSACTIONS (Transações Financeiras)
 * 
 * Detalhamento de baixas com juros, multa, IOF, tarifas
 */
export const financialTransactions = sqlServerTable("financial_transactions", {
  id: bigint("id", { mode: "number" }).primaryKey().identity(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull(),
  branchId: bigint("branch_id", { mode: "number" }).notNull(),
  
  // Relacionamento
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // PAYMENT, RECEIPT
  payableId: bigint("payable_id", { mode: "number" }), // FK para accounts_payable
  receivableId: bigint("receivable_id", { mode: "number" }), // FK para accounts_receivable
  
  // Data e Método
  transactionDate: datetime("transaction_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // PIX, TED, BOLETO, DINHEIRO
  bankAccountId: bigint("bank_account_id", { mode: "number" }),
  
  // Valores Detalhados
  originalAmount: decimal("original_amount", { precision: 18, scale: 2 }).notNull(), // Valor original do título
  interestAmount: decimal("interest_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`), // Juros
  fineAmount: decimal("fine_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`), // Multa
  discountAmount: decimal("discount_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`), // Desconto
  iofAmount: decimal("iof_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`), // IOF
  bankFeeAmount: decimal("bank_fee_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`), // Tarifa bancária
  otherFeesAmount: decimal("other_fees_amount", { precision: 18, scale: 2 }).notNull().default(sql`0.00`), // Outras taxas
  netAmount: decimal("net_amount", { precision: 18, scale: 2 }).notNull(), // Total pago/recebido
  
  // Lançamento Contábil da Baixa
  journalEntryId: bigint("journal_entry_id", { mode: "number" }), // FK para journal_entries
  
  // Conciliação Bancária
  reconciledAt: datetime("reconciled_at"),
  reconciledBy: bigint("reconciled_by", { mode: "number" }),
  bankStatementId: bigint("bank_statement_id", { mode: "number" }), // FK para bank_statements (futuro)
  
  // Observações
  notes: text("notes"),
  documentNumber: varchar("document_number", { length: 50 }), // Número do comprovante
  
  // Auditoria
  createdAt: datetime("created_at").notNull().default(sql`GETDATE()`),
  updatedAt: datetime("updated_at").notNull().default(sql`GETDATE()`),
  deletedAt: datetime("deleted_at"),
  createdBy: bigint("created_by", { mode: "number" }).notNull(),
  updatedBy: bigint("updated_by", { mode: "number" }).notNull(),
  version: int("version").notNull().default(1),
});







