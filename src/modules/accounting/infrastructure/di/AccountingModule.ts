import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DrizzleJournalEntryRepository } from '../persistence/DrizzleJournalEntryRepository';
import { CreateJournalEntryUseCase } from '../../application/use-cases/CreateJournalEntryUseCase';
import { AddLineToEntryUseCase } from '../../application/use-cases/AddLineToEntryUseCase';
import { PostJournalEntryUseCase } from '../../application/use-cases/PostJournalEntryUseCase';
import { ReverseJournalEntryUseCase } from '../../application/use-cases/ReverseJournalEntryUseCase';
import { ListJournalEntriesUseCase } from '../../application/use-cases/ListJournalEntriesUseCase';
import { GetJournalEntryByIdUseCase } from '../../application/use-cases/GetJournalEntryByIdUseCase';

/**
 * Registra todas as dependências do módulo Accounting
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 */
export function registerAccountingModule(): void {
  // Repository (Output Port)
  // NOTA: Existem duas interfaces IJournalEntryRepository no projeto:
  // - domain/ports/IJournalEntryRepository.ts (legada, com bigint)
  // - domain/ports/output/IJournalEntryRepository.ts (nova, com string UUID)
  // O DrizzleJournalEntryRepository implementa a interface legada.
  container.registerSingleton(
    TOKENS.JournalEntryRepository,
    DrizzleJournalEntryRepository
  );

  // Use Cases (Input Ports)
  container.registerSingleton(
    TOKENS.CreateJournalEntryUseCase,
    CreateJournalEntryUseCase
  );

  container.registerSingleton(
    TOKENS.AddLineToEntryUseCase,
    AddLineToEntryUseCase
  );

  container.registerSingleton(
    TOKENS.PostJournalEntryUseCase,
    PostJournalEntryUseCase
  );

  container.registerSingleton(
    TOKENS.ReverseJournalEntryUseCase,
    ReverseJournalEntryUseCase
  );

  container.registerSingleton(
    TOKENS.ListJournalEntriesUseCase,
    ListJournalEntriesUseCase
  );

  container.registerSingleton(
    TOKENS.GetJournalEntryByIdUseCase,
    GetJournalEntryByIdUseCase
  );
}
