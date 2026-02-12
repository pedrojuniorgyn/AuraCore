/**
 * 💰 FINANCIAL MODULE - DEPENDENCY INJECTION
 * 
 * Registra todos os repositórios, use cases e serviços do módulo Financial.
 * 
 * PADRÃO: StrategicModule.ts
 * REGRAS:
 * - BP-ARCH-006: Todo Use Case DEVE ser registrado no DI Container
 * - ARCH-011: Repositories implementam Output Ports
 * - ARCH-010: Use Cases implementam Input Ports
 */
import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// ============================================================
// REPOSITORIES
// ============================================================
import { DrizzlePayableRepository } from '../persistence/DrizzlePayableRepository';
import { DrizzleReceivableRepository } from '../persistence/DrizzleReceivableRepository';
import { DrizzleFinancialTitleRepository } from '../persistence/DrizzleFinancialTitleRepository';
import { DrizzleExpenseReportRepository } from '../persistence/expense/DrizzleExpenseReportRepository';
import { DrizzleReceiptRepository } from '../persistence/receipt/DrizzleReceiptRepository';

// ============================================================
// SERVICES
// ============================================================
import { FinancialTitleGenerator } from '../../application/services/FinancialTitleGenerator';
import { FinancialAccountingIntegration } from '../../application/services/FinancialAccountingIntegration';
import { ExpensePolicyService } from '../services/ExpensePolicyService';
import { ReceiptNumberGenerator } from '../services/ReceiptNumberGenerator';

// ============================================================
// ADAPTERS (Gateways)
// ============================================================
import { BillingPdfAdapter } from '../adapters/BillingPdfAdapter';
import { BoletoAdapter } from '../adapters/BoletoAdapter';
import { CnabAdapter } from '../adapters/CnabAdapter';

// ============================================================
// EVENTS (Domain Events Infrastructure)
// ============================================================
import { DomainEventDispatcher } from '../events/DomainEventDispatcher';

// ============================================================
// COMMANDS - PAYABLES (Contas a Pagar) (ARCH-012)
// ============================================================
import { CreatePayableUseCase } from '../../application/commands/CreatePayableUseCase';
import { PayAccountPayableUseCase } from '../../application/commands/PayAccountPayableUseCase';
import { CancelPayableUseCase } from '../../application/commands/CancelPayableUseCase';

// ============================================================
// QUERIES - PAYABLES (ARCH-013)
// ============================================================
import { GetPayableByIdUseCase } from '../../application/queries/GetPayableByIdUseCase';
import { ListPayablesUseCase } from '../../application/queries/ListPayablesUseCase';

// ============================================================
// COMMANDS - RECEIVABLES (Contas a Receber) (ARCH-012)
// ============================================================
import { CreateReceivableUseCase } from '../../application/commands/CreateReceivableUseCase';
import { ReceivePaymentUseCase } from '../../application/commands/ReceivePaymentUseCase';
import { CancelReceivableUseCase } from '../../application/commands/CancelReceivableUseCase';

// ============================================================
// QUERIES - RECEIVABLES (ARCH-013)
// ============================================================
import { GetReceivableByIdUseCase } from '../../application/queries/GetReceivableByIdUseCase';
import { ListReceivablesUseCase } from '../../application/queries/ListReceivablesUseCase';

// ============================================================
// COMMANDS - FINANCIAL TITLES (Títulos Financeiros)
// ============================================================
import { GeneratePayableTitleUseCase } from '../../application/commands/GeneratePayableTitleUseCase';
import { GenerateReceivableTitleUseCase } from '../../application/commands/GenerateReceivableTitleUseCase';
import { ReverseTitlesUseCase } from '../../application/commands/ReverseTitlesUseCase';

// ============================================================
// COMMANDS - EXPENSE REPORTS (Prestação de Contas)
// ============================================================
import { SubmitExpenseReportUseCase } from '../../application/commands/expense/SubmitExpenseReportUseCase';
import { ApproveExpenseReportUseCase } from '../../application/commands/expense/ApproveExpenseReportUseCase';
import { RejectExpenseReportUseCase } from '../../application/commands/expense/RejectExpenseReportUseCase';

// ============================================================
// COMMANDS - BILLING (Faturamento) (F1.5)
// ============================================================
import { FinalizeBillingInvoiceUseCase } from '../../application/commands/FinalizeBillingInvoiceUseCase';

// ============================================================
// COMMANDS - NFe/CTe -> Payable (F0.5.2, F0.5.3)
// ============================================================
import { CreatePayablesFromNFeUseCase } from '../../application/commands/CreatePayablesFromNFeUseCase';
import { UpdatePayableUseCase } from '../../application/commands/UpdatePayableUseCase';
import { SplitPayableUseCase } from '../../application/commands/SplitPayableUseCase';
import { ReschedulePayableUseCase } from '../../application/commands/ReschedulePayableUseCase';
import { UpdateReceivableUseCase } from '../../application/commands/UpdateReceivableUseCase';
import { PartialPaymentUseCase } from '../../application/commands/PartialPaymentUseCase';

// F2.3: Billing
import { CreateBillingInvoiceUseCase } from '../../application/commands/CreateBillingInvoiceUseCase';
import { UpdateBillingInvoiceUseCase } from '../../application/commands/UpdateBillingInvoiceUseCase';
import { CancelBillingInvoiceUseCase } from '../../application/commands/CancelBillingInvoiceUseCase';
import { SendBillingInvoiceUseCase } from '../../application/commands/SendBillingInvoiceUseCase';
import { ListBillingInvoicesUseCase } from '../../application/queries/ListBillingInvoicesUseCase';
import { GetBillingInvoiceByIdUseCase } from '../../application/queries/GetBillingInvoiceByIdUseCase';
import { GenerateBillingPdfUseCase } from '../../application/queries/GenerateBillingPdfUseCase';
import { CreatePayableFromExternalCTeUseCase } from '../../application/commands/CreatePayableFromExternalCTeUseCase';

// F2.4: Categories
import { ListCategoriesUseCase } from '../../application/queries/ListCategoriesUseCase';
import { CreateCategoryUseCase } from '../../application/commands/CreateCategoryUseCase';
import { UpdateCategoryUseCase as UpdateCategoryUseCaseImpl } from '../../application/commands/UpdateCategoryUseCase';
import { DeleteCategoryUseCase } from '../../application/commands/DeleteCategoryUseCase';

// F2.4: Cost Centers
import { ListCostCentersUseCase } from '../../application/queries/ListCostCentersUseCase';
import { GetCostCenterByIdUseCase } from '../../application/queries/GetCostCenterByIdUseCase';
import { CreateCostCenterUseCase } from '../../application/commands/CreateCostCenterUseCase';
import { UpdateCostCenterUseCase as UpdateCostCenterUseCaseImpl } from '../../application/commands/UpdateCostCenterUseCase';
import { DeleteCostCenterUseCase } from '../../application/commands/DeleteCostCenterUseCase';

// F2.4: Bank Accounts
import { ListBankAccountsUseCase } from '../../application/queries/ListBankAccountsUseCase';
import { CreateBankAccountUseCase } from '../../application/commands/CreateBankAccountUseCase';
import { UpdateBankAccountUseCase } from '../../application/commands/UpdateBankAccountUseCase';

// F2.4: Reporting (Cash Flow + DRE)
import { GetCashFlowUseCase } from '../../application/queries/GetCashFlowUseCase';
import { GetDreUseCase } from '../../application/queries/GetDreUseCase';

// ============================================================
// USE CASES - BANK STATEMENT (Extrato Bancário)
// ============================================================
import { ImportBankStatementUseCase } from '../../application/commands/import-bank-statement/ImportBankStatementUseCase';

// F4: Cross-Module Integration
import { CreatePayableFromTripUseCase } from '../../application/commands/CreatePayableFromTripUseCase';
import { CreateDriverReceiptUseCase } from '../../application/commands/CreateDriverReceiptUseCase';

// F6: Auto Reconciliation
import { AutoReconcileUseCase } from '../../application/commands/AutoReconcileUseCase';

// ============================================================
// LOCAL TOKENS (para items não registrados em TOKENS compartilhado)
// ============================================================
// Tokens locais — importados de tokens.ts para evitar dependências circulares
export { FINANCIAL_TOKENS } from './tokens';
import { FINANCIAL_TOKENS } from './tokens';

/**
 * Inicializa o módulo Financial no container DI
 */
export function initializeFinancialModule(): void {
  // ============================================================
  // REPOSITORIES (Fase 1 - Persistência)
  // ============================================================
  container.registerSingleton(TOKENS.PayableRepository, DrizzlePayableRepository);
  container.registerSingleton(FINANCIAL_TOKENS.ReceivableRepository, DrizzleReceivableRepository);
  container.registerSingleton(TOKENS.FinancialTitleRepository, DrizzleFinancialTitleRepository);
  container.registerSingleton(TOKENS.ExpenseReportRepository, DrizzleExpenseReportRepository);
  container.registerSingleton(TOKENS.ReceiptRepository, DrizzleReceiptRepository);
  
  // ============================================================
  // SERVICES (Fase 1 - Serviços de Domínio/Aplicação)
  // ============================================================
  container.registerSingleton(TOKENS.FinancialTitleGenerator, FinancialTitleGenerator);
  container.registerSingleton(TOKENS.ExpensePolicyService, ExpensePolicyService);
  container.registerSingleton(TOKENS.ReceiptNumberGenerator, ReceiptNumberGenerator);
  
  // ============================================================
  // ADAPTERS/GATEWAYS (Fase 1 - Integrações Externas)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.BillingPdfGateway, BillingPdfAdapter);
  container.registerSingleton(FINANCIAL_TOKENS.BoletoGateway, BoletoAdapter);
  container.registerSingleton(FINANCIAL_TOKENS.CnabGateway, CnabAdapter);
  
  // ============================================================
  // USE CASES - PAYABLES (Fase 2 - Contas a Pagar)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.CreatePayableUseCase, CreatePayableUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.GetPayableByIdUseCase, GetPayableByIdUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.ListPayablesUseCase, ListPayablesUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.PayAccountPayableUseCase, PayAccountPayableUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CancelPayableUseCase, CancelPayableUseCase);
  
  // ============================================================
  // USE CASES - RECEIVABLES (Fase 2 - Contas a Receber)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.CreateReceivableUseCase, CreateReceivableUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.GetReceivableByIdUseCase, GetReceivableByIdUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.ListReceivablesUseCase, ListReceivablesUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.ReceivePaymentUseCase, ReceivePaymentUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CancelReceivableUseCase, CancelReceivableUseCase);
  
  // ============================================================
  // USE CASES - FINANCIAL TITLES (Fase 2 - Geração de Títulos)
  // ============================================================
  container.registerSingleton(TOKENS.GeneratePayableTitleUseCase, GeneratePayableTitleUseCase);
  container.registerSingleton(TOKENS.GenerateReceivableTitleUseCase, GenerateReceivableTitleUseCase);
  container.registerSingleton(TOKENS.ReverseTitlesUseCase, ReverseTitlesUseCase);
  
  // ============================================================
  // USE CASES - EXPENSE REPORTS (Fase 2 - Prestação de Contas)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.SubmitExpenseReportUseCase, SubmitExpenseReportUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.ApproveExpenseReportUseCase, ApproveExpenseReportUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.RejectExpenseReportUseCase, RejectExpenseReportUseCase);
  
  // ============================================================
  // USE CASES - BILLING (F1.5 - Faturamento)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.FinalizeBillingInvoiceUseCase, FinalizeBillingInvoiceUseCase);
  
  // ============================================================
  // USE CASES - NFe/CTe -> PAYABLE (F0.5.2, F0.5.3)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.CreatePayablesFromNFeUseCase, CreatePayablesFromNFeUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CreatePayableFromExternalCTeUseCase, CreatePayableFromExternalCTeUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.UpdatePayableUseCase, UpdatePayableUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.SplitPayableUseCase, SplitPayableUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.ReschedulePayableUseCase, ReschedulePayableUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.UpdateReceivableUseCase, UpdateReceivableUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.PartialPaymentUseCase, PartialPaymentUseCase);
  
  // Billing Use Cases (F2.3)
  container.registerSingleton(FINANCIAL_TOKENS.CreateBillingInvoiceUseCase, CreateBillingInvoiceUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.UpdateBillingInvoiceUseCase, UpdateBillingInvoiceUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CancelBillingInvoiceUseCase, CancelBillingInvoiceUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.SendBillingInvoiceUseCase, SendBillingInvoiceUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.ListBillingInvoicesUseCase, ListBillingInvoicesUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.GetBillingInvoiceByIdUseCase, GetBillingInvoiceByIdUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.GenerateBillingPdfUseCase, GenerateBillingPdfUseCase);

  // ============================================================
  // USE CASES - BANK STATEMENT (Fase 2 - Extrato Bancário)
  // ============================================================
  container.registerSingleton(TOKENS.ImportBankStatementUseCase, ImportBankStatementUseCase);
  
  // ============================================================
  // F2.4: CATEGORIES
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.ListCategoriesUseCase, ListCategoriesUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CreateCategoryUseCase, CreateCategoryUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.UpdateCategoryUseCase, UpdateCategoryUseCaseImpl);
  container.registerSingleton(FINANCIAL_TOKENS.DeleteCategoryUseCase, DeleteCategoryUseCase);

  // ============================================================
  // F2.4: COST CENTERS
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.ListCostCentersUseCase, ListCostCentersUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.GetCostCenterByIdUseCase, GetCostCenterByIdUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CreateCostCenterUseCase, CreateCostCenterUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.UpdateCostCenterUseCase, UpdateCostCenterUseCaseImpl);
  container.registerSingleton(FINANCIAL_TOKENS.DeleteCostCenterUseCase, DeleteCostCenterUseCase);

  // ============================================================
  // F2.4: BANK ACCOUNTS
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.ListBankAccountsUseCase, ListBankAccountsUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CreateBankAccountUseCase, CreateBankAccountUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.UpdateBankAccountUseCase, UpdateBankAccountUseCase);

  // ============================================================
  // F2.4: REPORTING (Cash Flow + DRE)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.GetCashFlowUseCase, GetCashFlowUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.GetDreUseCase, GetDreUseCase);

  // ============================================================
  // EVENT DISPATCHER (Domain Events Infrastructure)
  // ============================================================
  // ✅ FIX Bug #3: Register DomainEventDispatcher in DI
  // Allows use cases to inject and dispatch domain events
  container.registerSingleton(TOKENS.EventDispatcher, DomainEventDispatcher);
  
  // ============================================================
  // INTEGRATION SERVICES (F1.2: Financial → Accounting)
  // ============================================================
  container.registerSingleton(TOKENS.FinancialAccountingIntegration, FinancialAccountingIntegration);

  // ============================================================
  // F4: Cross-Module Integration (TMS->Financial, Payment->Receipt)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.CreatePayableFromTripUseCase, CreatePayableFromTripUseCase);
  container.registerSingleton(FINANCIAL_TOKENS.CreateDriverReceiptUseCase, CreateDriverReceiptUseCase);

  // ============================================================
  // F6: AUTO RECONCILIATION (Conciliação Bancária Automática)
  // ============================================================
  container.registerSingleton(FINANCIAL_TOKENS.AutoReconcileUseCase, AutoReconcileUseCase);
}
