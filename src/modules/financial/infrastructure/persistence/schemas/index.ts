/**
 * Financial Persistence Schemas - Export Index
 * 
 * Módulo Financial DDD
 * 
 * NOTA: Exporta aliases backward-compat (accountsPayable, accountsReceivable)
 * para que rotas V1 continuem funcionando sem alterar column references.
 * Na Fase 2 (migração de rotas para DDD Use Cases), os aliases serão removidos.
 */

// DDD schemas (canônicos)
export * from './PayableSchema';
export * from './ReceivableSchema';

// Backward-compat aliases para rotas V1
// V1 routes importam `accountsPayable` / `accountsReceivable` de @/lib/db/schema
import { accountsPayableTable } from './PayableSchema';
import { accountsReceivableTable } from './ReceivableSchema';

export const accountsPayable = accountsPayableTable;
export const accountsReceivable = accountsReceivableTable;
