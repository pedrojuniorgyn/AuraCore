import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import { DrizzleJournalEntryRepository } from '../persistence/DrizzleJournalEntryRepository';
import { CreateJournalEntryUseCase } from '../../application/use-cases/CreateJournalEntryUseCase';
import { AddLineToEntryUseCase } from '../../application/use-cases/AddLineToEntryUseCase';
import { PostJournalEntryUseCase } from '../../application/use-cases/PostJournalEntryUseCase';
import { ReverseJournalEntryUseCase } from '../../application/use-cases/ReverseJournalEntryUseCase';
import { ListJournalEntriesUseCase } from '../../application/use-cases/ListJournalEntriesUseCase';
import { GetJournalEntryByIdUseCase } from '../../application/use-cases/GetJournalEntryByIdUseCase';

/**
 * Registra todas as dependências do módulo Accounting
 */
export function registerAccountingModule(): void {
  // Repository
  container.registerSingleton(
    TOKENS.JournalEntryRepository,
    DrizzleJournalEntryRepository
  );

  // Use Cases
  container.registerSingleton(CreateJournalEntryUseCase);
  container.registerSingleton(AddLineToEntryUseCase);
  container.registerSingleton(PostJournalEntryUseCase);
  container.registerSingleton(ReverseJournalEntryUseCase);
  container.registerSingleton(ListJournalEntriesUseCase);
  container.registerSingleton(GetJournalEntryByIdUseCase);
}

