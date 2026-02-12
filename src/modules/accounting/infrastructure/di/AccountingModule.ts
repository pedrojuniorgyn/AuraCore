import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DrizzleJournalEntryRepository } from '../persistence/DrizzleJournalEntryRepository';
import { DrizzleFiscalAccountingRepository } from '../persistence/DrizzleFiscalAccountingRepository';
import { DrizzleAccountDeterminationRepository } from '../persistence/repositories/DrizzleAccountDeterminationRepository';
import { DrizzleChartOfAccountsRepository } from '../persistence/repositories/DrizzleChartOfAccountsRepository';
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

// F2.4: Chart of Accounts Use Cases
import { ListChartOfAccountsUseCase } from '../../application/queries/ListChartOfAccountsUseCase';
import { GetChartAccountByIdUseCase } from '../../application/queries/GetChartAccountByIdUseCase';
import { SuggestChartAccountCodeUseCase } from '../../application/queries/SuggestChartAccountCodeUseCase';
import { CreateChartAccountUseCase } from '../../application/commands/CreateChartAccountUseCase';
import { UpdateChartAccountUseCase } from '../../application/commands/UpdateChartAccountUseCase';
import { DeleteChartAccountUseCase } from '../../application/commands/DeleteChartAccountUseCase';

// F3.5: Accounting Period Use Cases
import { CloseAccountingPeriodUseCase } from '../../application/commands/CloseAccountingPeriodUseCase';
import { GenerateTrialBalanceUseCase } from '../../application/queries/GenerateTrialBalanceUseCase';

import { logger } from '@/shared/infrastructure/logging';
// Tokens locais — importados de tokens.ts para evitar dependências circulares
export { ACCOUNTING_TOKENS } from './tokens';
import { ACCOUNTING_TOKENS } from './tokens';

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

  // Repository: Determinação de contas contábeis (F1.1)
  container.registerSingleton(
    TOKENS.AccountDeterminationRepository,
    DrizzleAccountDeterminationRepository
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

  // Repository: Plano de Contas (F1.8 - Integridade Contábil)
  container.registerSingleton(
    ACCOUNTING_TOKENS.ChartOfAccountsRepository,
    DrizzleChartOfAccountsRepository
  );

  // ============================================================
  // F2.4: Chart of Accounts Use Cases
  // ============================================================
  container.registerSingleton(
    ACCOUNTING_TOKENS.ListChartOfAccountsUseCase,
    ListChartOfAccountsUseCase
  );
  container.registerSingleton(
    ACCOUNTING_TOKENS.GetChartAccountByIdUseCase,
    GetChartAccountByIdUseCase
  );
  container.registerSingleton(
    ACCOUNTING_TOKENS.SuggestChartAccountCodeUseCase,
    SuggestChartAccountCodeUseCase
  );
  container.registerSingleton(
    ACCOUNTING_TOKENS.CreateChartAccountUseCase,
    CreateChartAccountUseCase
  );
  container.registerSingleton(
    ACCOUNTING_TOKENS.UpdateChartAccountUseCase,
    UpdateChartAccountUseCase
  );
  container.registerSingleton(
    ACCOUNTING_TOKENS.DeleteChartAccountUseCase,
    DeleteChartAccountUseCase
  );

  // ============================================================
  // F3.5: Accounting Period Use Cases
  // ============================================================
  container.registerSingleton(
    ACCOUNTING_TOKENS.CloseAccountingPeriodUseCase,
    CloseAccountingPeriodUseCase
  );
  container.registerSingleton(
    ACCOUNTING_TOKENS.GenerateTrialBalanceUseCase,
    GenerateTrialBalanceUseCase
  );

  logger.info('[Accounting Module] DI registrado: 4 repos + 14 use cases + 2 gateways');
}
