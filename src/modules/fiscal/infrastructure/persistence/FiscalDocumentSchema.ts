import { sql } from 'drizzle-orm';
import { char, varchar, decimal, int, datetime, text, mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: fiscal_documents
 * 
 * Persistence model para FiscalDocument aggregate root
 */
export const fiscalDocuments = mssqlTable('fiscal_documents', {
  // Identificação
  id: char('id', { length: 36 }).primaryKey(),
  documentType: varchar('document_type', { length: 10 }).notNull(), // NFE, CTE, MDFE, NFSE
  series: varchar('series', { length: 10 }).notNull(),
  number: varchar('number', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // DRAFT, PENDING, PROCESSING, AUTHORIZED, REJECTED, CANCELLED
  
  // Datas
  issueDate: datetime('issue_date').notNull(),
  
  // Emitente (obrigatório)
  issuerId: varchar('issuer_id', { length: 255 }).notNull(),
  issuerCnpj: char('issuer_cnpj', { length: 14 }).notNull(),
  issuerName: varchar('issuer_name', { length: 255 }).notNull(),
  
  // Destinatário (opcional - BUG 2 FIX)
  recipientId: varchar('recipient_id', { length: 255 }), // BUG 1 NEW FIX: System identifier
  recipientCnpjCpf: varchar('recipient_cnpj_cpf', { length: 14 }),
  recipientName: varchar('recipient_name', { length: 255 }),
  
  // Valores (BUG 1 FIX: adicionar currency)
  totalValue: decimal('total_value', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'), // ISO 4217
  
  // Reforma Tributária (Week 3)
  taxRegime: varchar('tax_regime', { length: 20 }).notNull().default('CURRENT'), // CURRENT, TRANSITION, NEW
  totalIbs: decimal('total_ibs', { precision: 18, scale: 2 }),
  totalIbsCurrency: varchar('total_ibs_currency', { length: 3 }),
  totalCbs: decimal('total_cbs', { precision: 18, scale: 2 }),
  totalCbsCurrency: varchar('total_cbs_currency', { length: 3 }),
  totalIs: decimal('total_is', { precision: 18, scale: 2 }),
  totalIsCurrency: varchar('total_is_currency', { length: 3 }),
  totalDFeValue: decimal('total_dfe_value', { precision: 18, scale: 2 }),
  totalDFeValueCurrency: varchar('total_dfe_value_currency', { length: 3 }),
  ibsCbsMunicipalityCode: varchar('ibs_cbs_municipality_code', { length: 7 }),
  governmentPurchaseEntityType: int('government_purchase_entity_type'),
  governmentPurchaseRateReduction: decimal('government_purchase_rate_reduction', { precision: 5, scale: 2 }),
  
  // Chave fiscal e protocolo (após autorização)
  fiscalKey: char('fiscal_key', { length: 44 }),
  protocolNumber: varchar('protocol_number', { length: 50 }),
  
  // Rejeição
  rejectionCode: varchar('rejection_code', { length: 10 }),
  rejectionReason: varchar('rejection_reason', { length: 500 }),
  
  // Observações
  notes: text('notes'),
  
  // Multi-tenancy
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Audit
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime('updated_at').notNull().default(sql`GETDATE()`),
});

/**
 * Drizzle Schema: fiscal_document_items
 * 
 * Persistence model para FiscalDocumentItem entity
 */
export const fiscalDocumentItems = mssqlTable('fiscal_document_items', {
  // Identificação
  id: char('id', { length: 36 }).primaryKey(),
  documentId: char('document_id', { length: 36 }).notNull(),
  
  // Item
  itemNumber: int('item_number').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 2 }).notNull(),
  totalValue: decimal('total_value', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'), // BUG 1 FIX: ISO 4217
  
  // Classificação fiscal
  ncm: char('ncm', { length: 8 }),
  cfop: char('cfop', { length: 4 }).notNull(),
  unitOfMeasure: varchar('unit_of_measure', { length: 10 }).notNull(),
  
  // Audit
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
});

/**
 * Drizzle Schema: fiscal_document_taxes
 * 
 * Persistence model para impostos calculados por item
 * (Será utilizado quando integrarmos CalculateTaxesUseCase com Tax Engine)
 */
export const fiscalDocumentTaxes = mssqlTable('fiscal_document_taxes', {
  // Identificação
  id: char('id', { length: 36 }).primaryKey(),
  documentId: char('document_id', { length: 36 }).notNull(),
  itemId: char('item_id', { length: 36 }).notNull(),
  
  // Tipo de imposto
  taxType: varchar('tax_type', { length: 10 }).notNull(), // ICMS, IPI, PIS, COFINS, ISS
  
  // Base de cálculo
  baseCalculo: decimal('base_calculo', { precision: 18, scale: 2 }).notNull(),
  aliquota: decimal('aliquota', { precision: 5, scale: 2 }).notNull(), // Percentual
  valor: decimal('valor', { precision: 18, scale: 2 }).notNull(),
  
  // Audit
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
});

