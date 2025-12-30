import { sql } from 'drizzle-orm';
import { char, varchar, decimal, int, datetime, mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: fiscal_document_ibs_cbs
 * 
 * Persistence model para IBSCBSGroup (detalhamento IBS/CBS por documento ou item)
 * 
 * Relacionamentos:
 * - fiscalDocumentId: FK para fiscal_documents (obrigatório)
 * - fiscalDocumentItemId: FK para fiscal_document_items (opcional - null = nível documento)
 */
export const fiscalDocumentIbsCbs = mssqlTable('fiscal_document_ibs_cbs', {
  // Identificação
  id: char('id', { length: 36 }).primaryKey(),
  fiscalDocumentId: char('fiscal_document_id', { length: 36 }).notNull(),
  fiscalDocumentItemId: char('fiscal_document_item_id', { length: 36 }), // nullable - se null, é do documento
  
  // CST e Classificação
  cst: char('cst', { length: 2 }).notNull(), // CST IBS/CBS (00, 10, 20, etc)
  cClassTrib: char('c_class_trib', { length: 5 }).notNull(), // Código Classificação Tributária
  
  // Base de Cálculo
  baseValue: decimal('base_value', { precision: 18, scale: 2 }).notNull(),
  baseValueCurrency: varchar('base_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // IBS UF (Estadual)
  ibsUfRate: decimal('ibs_uf_rate', { precision: 5, scale: 2 }).notNull(), // Percentual
  ibsUfValue: decimal('ibs_uf_value', { precision: 18, scale: 2 }).notNull(),
  ibsUfValueCurrency: varchar('ibs_uf_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // IBS Municipal
  ibsMunRate: decimal('ibs_mun_rate', { precision: 5, scale: 2 }).notNull(), // Percentual
  ibsMunValue: decimal('ibs_mun_value', { precision: 18, scale: 2 }).notNull(),
  ibsMunValueCurrency: varchar('ibs_mun_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // CBS (Federal)
  cbsRate: decimal('cbs_rate', { precision: 5, scale: 2 }).notNull(), // Percentual
  cbsValue: decimal('cbs_value', { precision: 18, scale: 2 }).notNull(),
  cbsValueCurrency: varchar('cbs_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // Diferimento (opcional)
  deferralRate: decimal('deferral_rate', { precision: 5, scale: 2 }),
  deferralIbsValue: decimal('deferral_ibs_value', { precision: 18, scale: 2 }),
  deferralIbsValueCurrency: varchar('deferral_ibs_value_currency', { length: 3 }),
  deferralCbsValue: decimal('deferral_cbs_value', { precision: 18, scale: 2 }),
  deferralCbsValueCurrency: varchar('deferral_cbs_value_currency', { length: 3 }),
  
  // Devolução/Ressarcimento (opcional)
  refundIbsValue: decimal('refund_ibs_value', { precision: 18, scale: 2 }),
  refundIbsValueCurrency: varchar('refund_ibs_value_currency', { length: 3 }),
  refundCbsValue: decimal('refund_cbs_value', { precision: 18, scale: 2 }),
  refundCbsValueCurrency: varchar('refund_cbs_value_currency', { length: 3 }),
  
  // Redução (opcional)
  reductionIbsRate: decimal('reduction_ibs_rate', { precision: 5, scale: 2 }),
  reductionCbsRate: decimal('reduction_cbs_rate', { precision: 5, scale: 2 }),
  
  // Crédito Presumido (opcional)
  presumedCreditCode: varchar('presumed_credit_code', { length: 10 }),
  presumedCreditRate: decimal('presumed_credit_rate', { precision: 5, scale: 2 }),
  presumedCreditIbsValue: decimal('presumed_credit_ibs_value', { precision: 18, scale: 2 }),
  presumedCreditIbsValueCurrency: varchar('presumed_credit_ibs_value_currency', { length: 3 }),
  presumedCreditCbsValue: decimal('presumed_credit_cbs_value', { precision: 18, scale: 2 }),
  presumedCreditCbsValueCurrency: varchar('presumed_credit_cbs_value_currency', { length: 3 }),
  
  // Compra Governamental (opcional)
  governmentPurchaseEntityType: int('government_purchase_entity_type'),
  governmentPurchaseReductionRate: decimal('government_purchase_reduction_rate', { precision: 5, scale: 2 }),
  
  // Audit
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime('updated_at').notNull().default(sql`GETDATE()`),
});

