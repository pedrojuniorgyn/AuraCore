import { varchar, char, decimal, datetime, int, mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: fiscal_document_ibs_cbs
 * 
 * Persistence model para IBSCBSGroup Value Object
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. Schema DEVE espelhar Domain Model COMPLETO (IBSCBSGroup)
 * 2. Campos opcionais = .nullable()
 * 3. Money com 2 campos: decimal (amount) + varchar(3) (currency)
 * 4. Multi-tenancy: organizationId + branchId
 * 5. Audit: createdAt, updatedAt
 */
export const fiscalDocumentIbsCbs = mssqlTable('fiscal_document_ibs_cbs', {
  // Identificação
  id: char('id', { length: 36 }).primaryKey(),
  fiscalDocumentId: char('fiscal_document_id', { length: 36 }).notNull(),
  fiscalDocumentItemId: char('fiscal_document_item_id', { length: 36 }), // nullable - pode ser do documento inteiro
  
  // Multi-tenancy
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Campos obrigatórios
  cst: varchar('cst', { length: 2 }).notNull(), // CST IBS/CBS (00-99)
  cClassTrib: varchar('c_class_trib', { length: 20 }).notNull(), // Classificação tributária
  
  // Base de Cálculo (Money = 2 campos)
  baseValue: decimal('base_value', { precision: 18, scale: 2 }).notNull(),
  baseValueCurrency: varchar('base_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // IBS UF (alíquota + valor)
  ibsUfRate: decimal('ibs_uf_rate', { precision: 7, scale: 4 }).notNull(), // até 100.0000%
  ibsUfValue: decimal('ibs_uf_value', { precision: 18, scale: 2 }).notNull(),
  ibsUfValueCurrency: varchar('ibs_uf_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // IBS Municipal (alíquota + valor)
  ibsMunRate: decimal('ibs_mun_rate', { precision: 7, scale: 4 }).notNull(),
  ibsMunValue: decimal('ibs_mun_value', { precision: 18, scale: 2 }).notNull(),
  ibsMunValueCurrency: varchar('ibs_mun_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // CBS (alíquota + valor)
  cbsRate: decimal('cbs_rate', { precision: 7, scale: 4 }).notNull(),
  cbsValue: decimal('cbs_value', { precision: 18, scale: 2 }).notNull(),
  cbsValueCurrency: varchar('cbs_value_currency', { length: 3 }).notNull().default('BRL'),
  
  // Alíquotas efetivas (opcionais)
  ibsUfEffectiveRate: decimal('ibs_uf_effective_rate', { precision: 7, scale: 4 }),
  ibsMunEffectiveRate: decimal('ibs_mun_effective_rate', { precision: 7, scale: 4 }),
  cbsEffectiveRate: decimal('cbs_effective_rate', { precision: 7, scale: 4 }),
  
  // Diferimento (gDif) - opcional
  deferralRate: decimal('deferral_rate', { precision: 5, scale: 2 }),
  deferralIbsValue: decimal('deferral_ibs_value', { precision: 18, scale: 2 }),
  deferralIbsValueCurrency: varchar('deferral_ibs_value_currency', { length: 3 }),
  deferralCbsValue: decimal('deferral_cbs_value', { precision: 18, scale: 2 }),
  deferralCbsValueCurrency: varchar('deferral_cbs_value_currency', { length: 3 }),
  
  // Devolução (gDev) - opcional
  refundIbsValue: decimal('refund_ibs_value', { precision: 18, scale: 2 }),
  refundIbsValueCurrency: varchar('refund_ibs_value_currency', { length: 3 }),
  refundCbsValue: decimal('refund_cbs_value', { precision: 18, scale: 2 }),
  refundCbsValueCurrency: varchar('refund_cbs_value_currency', { length: 3 }),
  
  // Redução (gRed) - opcional
  reductionIbsRate: decimal('reduction_ibs_rate', { precision: 5, scale: 2 }),
  reductionCbsRate: decimal('reduction_cbs_rate', { precision: 5, scale: 2 }),
  
  // Crédito Presumido (gCredPres) - opcional
  presumedCreditCode: varchar('presumed_credit_code', { length: 10 }),
  presumedCreditRate: decimal('presumed_credit_rate', { precision: 5, scale: 2 }),
  presumedCreditIbsValue: decimal('presumed_credit_ibs_value', { precision: 18, scale: 2 }),
  presumedCreditIbsValueCurrency: varchar('presumed_credit_ibs_value_currency', { length: 3 }),
  presumedCreditCbsValue: decimal('presumed_credit_cbs_value', { precision: 18, scale: 2 }),
  presumedCreditCbsValueCurrency: varchar('presumed_credit_cbs_value_currency', { length: 3 }),
  
  // Compras Governamentais (gCompraGov) - opcional
  governmentPurchaseEntityType: int('government_purchase_entity_type'), // 1=União, 2=Estado/DF, 3=Município
  governmentPurchaseReductionRate: decimal('government_purchase_reduction_rate', { precision: 5, scale: 2 }),
  
  // Auditoria
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

/**
 * Índices recomendados para performance:
 * 
 * CREATE INDEX idx_fiscal_doc_ibs_cbs_doc_id 
 *   ON fiscal_document_ibs_cbs(fiscal_document_id);
 * 
 * CREATE INDEX idx_fiscal_doc_ibs_cbs_item_id 
 *   ON fiscal_document_ibs_cbs(fiscal_document_item_id)
 *   WHERE fiscal_document_item_id IS NOT NULL;
 * 
 * CREATE INDEX idx_fiscal_doc_ibs_cbs_organization 
 *   ON fiscal_document_ibs_cbs(organization_id, branch_id);
 * 
 * CREATE INDEX idx_fiscal_doc_ibs_cbs_cst 
 *   ON fiscal_document_ibs_cbs(cst);
 */
