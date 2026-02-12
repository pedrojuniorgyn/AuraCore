/**
 * Accounting Persistence Schemas - Export Index
 * 
 * Módulo Accounting DDD
 * 
 * NOTA: Este barrel NÃO é re-exportado via src/lib/db/schema.ts (Fase 0).
 * O schema.ts central ainda exporta a versão legacy de journalEntries/journalEntryLines
 * (bigint IDs, via src/lib/db/schema/accounting.ts) porque accounting-engine.ts
 * usa colunas legacy-específicas (sourceType, debitAmount/creditAmount, chartAccountId).
 * Na Fase 1, accounting-engine.ts será migrado para DDD e este barrel será
 * integrado ao schema.ts central.
 * 
 * Uso: Import direto pelo DDD module (repositories, mappers).
 */

// DDD schemas (canônicos - char(36) UUID)
export * from './JournalEntrySchema';
export * from './AccountDeterminationSchema';
export * from './accounting-period-closing.schema';