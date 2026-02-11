/**
 * Fiscal Persistence Schemas - Export Index
 * 
 * Módulo Fiscal DDD
 * 
 * NOTA: NÃO re-exportar FiscalDocumentSchema aqui.
 * O schema.ts central exporta fiscalDocuments/fiscalDocumentItems via
 * src/lib/db/schema/accounting.ts (legacy, bigint IDs).
 * O DDD module usa FiscalDocumentSchema.ts diretamente via import local.
 * Na Fase 3, migraremos o schema central para a versão DDD (char(36) UUID).
 */

export * from './SplitPaymentSchema';
