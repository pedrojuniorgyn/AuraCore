import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DrizzleJournalEntryRepository } from '../persistence/DrizzleJournalEntryRepository';
import { DrizzleFiscalAccountingRepository } from '../persistence/DrizzleFiscalAccountingRepository';
// Commands (ARCH-012)
import { CreateJournalEntryUseCase } from '../../application/commands/CreateJournalEntryUseCase';
import { AddLineToEntryUseCase } from '../../application/commands/AddLineToEntryUseCase';
import { PostJournalEntryUseCase } from '../../application/commands/PostJournalEntryUseCase';
import { ReverseJournalEntryUseCase } from '../../application/commands/ReverseJournalEntryUseCase';
import { GenerateJournalEntryUseCase } from '../../application/commands/GenerateJournalEntryUseCase';
// Queries (ARCH-013)
import { ListJournalEntriesUseCase } from '../../application/queries/ListJournalEntriesUseCase';
import { GetJournalEntryByIdUseCase } from '../../application/queries/GetJournalEntryByIdUseCase';

// Gateways (E9 Fase 1 + Fase 2)
import { ManagementAccountingAdapter } from '../adapters/ManagementAccountingAdapter';
import type { IManagementAccountingGateway } from '../../domain/ports/output/IManagementAccountingGateway';
import { CostCenterAllocationAdapter } from '../adapters/CostCenterAllocationAdapter';
import type { ICostCenterAllocationGateway } from '../../domain/ports/output/ICostCenterAllocationGateway';

import { logger } from '@/shared/infrastructure/logging';
// Tokens locais (E9 Fase 1 + Fase 2)
export const ACCOUNTING_TOKENS = {
  ManagementAccountingGateway: Symbol.for('IManagementAccountingGateway'),
  CostCenterAllocationGateway: Symbol.for('ICostCenterAllocationGateway'),
};

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

  container.registerSingleton(
    TOKENS.GenerateJournalEntryUseCase,
    GenerateJournalEntryUseCase
  );

  // Gateway de Contabilidade Gerencial (E9 Fase 1)
  container.registerSingleton<IManagementAccountingGateway>(
    ACCOUNTING_TOKENS.ManagementAccountingGateway,
    ManagementAccountingAdapter
  );

  // Gateway de Alocação de Centro de Custo (E9 Fase 2)
  container.registerSingleton<ICostCenterAllocationGateway>(
    ACCOUNTING_TOKENS.CostCenterAllocationGateway,
    CostCenterAllocationAdapter
  );

  logger.info('[Accounting Module] DI registrado: 2 repos + 6 use cases + 2 gateways');
}
