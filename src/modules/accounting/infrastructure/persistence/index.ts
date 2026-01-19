/**
 * Persistence Adapters
 * 
 * Exporta adapters de persistência do módulo Accounting
 */

// Fiscal Accounting (contabilização de documentos fiscais)
export {
  DrizzleFiscalAccountingRepository,
  createFiscalAccountingRepository,
  createJournalEntryRepository, // @deprecated - use createFiscalAccountingRepository
} from './DrizzleFiscalAccountingRepository';

// Journal Entry (CRUD de lançamentos contábeis)
export { DrizzleJournalEntryRepository } from './DrizzleJournalEntryRepository';

// Schemas
export * from './JournalEntrySchema';

// Mapper
export { JournalEntryMapper } from './JournalEntryMapper';
