/**
 * Fiscal Persistence Schemas - Barrel Export
 *
 * Source of Truth para todas as tabelas do módulo Fiscal.
 * Exporta tanto nomes DDD (sufixo *Table) quanto aliases bare-name
 * para compatibilidade com rotas V1 e use cases.
 *
 * NOTA: Nenhuma dependência circular com @/lib/db/schema.
 * O schema.ts central re-importa DAQUI (inversão de dependência).
 */

export * from './SplitPaymentSchema';
export * from './cfop-determination.schema';
export * from './FiscalSchema';
