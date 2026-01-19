import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DrizzleJournalEntryRepository } from '../persistence/DrizzleJournalEntryRepository';
import { DrizzleFiscalAccountingRepository } from '../persistence/DrizzleFiscalAccountingRepository';
import { CreateJournalEntryUseCase } from '../../application/use-cases/CreateJournalEntryUseCase';
import { AddLineToEntryUseCase } from '../../application/use-cases/AddLineToEntryUseCase';
import { PostJournalEntryUseCase } from '../../application/use-cases/PostJournalEntryUseCase';
import { ReverseJournalEntryUseCase } from '../../application/use-cases/ReverseJournalEntryUseCase';
import { ListJournalEntriesUseCase } from '../../application/use-cases/ListJournalEntriesUseCase';
import { GetJournalEntryByIdUseCase } from '../../application/use-cases/GetJournalEntryByIdUseCase';

/**
 * Registra todas as dependências do módulo Accounting
 *
 * Arquitetura E7.27 - Interfaces Consolidadas:
 * - IJournalEntryRepository (ports/output/): CRUD de JournalEntry Entity
 * - IFiscalAccountingRepository (ports/): Contabilização de documentos fiscais
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 */
export function registerAccountingModule(): void {
  // Repository DDD (Output Port) - CRUD de JournalEntry Entity
  // Implementa ports/output/IJournalEntryRepository
  container.registerSingleton(
    TOKENS.JournalEntryRepository,
    DrizzleJournalEntryRepository
  );

  // Repository Fiscal (Contabilização de documentos fiscais)
  // Implementa ports/IFiscalAccountingRepository
  container.registerSingleton(
    TOKENS.FiscalAccountingRepository,
    DrizzleFiscalAccountingRepository
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
