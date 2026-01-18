/**
 * Application Use Cases
 *
 * Exporta casos de uso do módulo Accounting
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

// Commands
export { CreateJournalEntryUseCase } from './CreateJournalEntryUseCase';
export { AddLineToEntryUseCase } from './AddLineToEntryUseCase';
export { PostJournalEntryUseCase } from './PostJournalEntryUseCase';
export { ReverseJournalEntryUseCase } from './ReverseJournalEntryUseCase';

// Queries
export { ListJournalEntriesUseCase } from './ListJournalEntriesUseCase';
export { GetJournalEntryByIdUseCase } from './GetJournalEntryByIdUseCase';

// Legacy (manter para compatibilidade)
export { GenerateJournalEntryUseCase } from './GenerateJournalEntryUseCase';
export type {
  GenerateJournalEntryInput,
  GenerateJournalEntryOutput,
} from './GenerateJournalEntryUseCase';

// Base
export type { ExecutionContext, IUseCaseWithContext, IUseCase } from './BaseUseCase';
