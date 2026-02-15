/**
 * Financial Persistence Schemas - Barrel Export
 *
 * Source of Truth para todas as tabelas do módulo Financial.
 * Exporta tanto nomes DDD (sufixo *Table) quanto aliases bare-name
 * para compatibilidade com rotas V1 e use cases.
 *
 * NOTA: Nenhuma dependência circular com @/lib/db/schema.
 * O schema.ts central re-importa DAQUI (inversão de dependência).
 */

export * from './PayableSchema';
export * from './ReceivableSchema';
export * from './FinancialCategorySchema';
