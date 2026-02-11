/**
 * Application Use Cases - Re-exports from commands/ and queries/
 *
 * @see ARCH-012: Commands em pasta commands/
 * @see ARCH-013: Queries em pasta queries/
 */

// Commands
export { CreateJournalEntryUseCase } from '../commands/CreateJournalEntryUseCase';
export { AddLineToEntryUseCase } from '../commands/AddLineToEntryUseCase';
export { PostJournalEntryUseCase } from '../commands/PostJournalEntryUseCase';
export { ReverseJournalEntryUseCase } from '../commands/ReverseJournalEntryUseCase';

// Queries
export { ListJournalEntriesUseCase } from '../queries/ListJournalEntriesUseCase';
export { GetJournalEntryByIdUseCase } from '../queries/GetJournalEntryByIdUseCase';

// Legacy (manter para compatibilidade)
export { GenerateJournalEntryUseCase } from '../commands/GenerateJournalEntryUseCase';
export type {
  GenerateJournalEntryInput,
  GenerateJournalEntryOutput,
} from '../commands/GenerateJournalEntryUseCase';

// Base
export type { ExecutionContext, IUseCaseWithContext, IUseCase } from './BaseUseCase';
