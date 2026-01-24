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
import { ExpensePolicyService } from '../services/ExpensePolicyService';
import { ReceiptNumberGenerator } from '../services/ReceiptNumberGenerator';

// ============================================================
// ADAPTERS (Gateways)
// ============================================================
import { BillingPdfAdapter } from '../adapters/BillingPdfAdapter';
import { BoletoAdapter } from '../adapters/BoletoAdapter';
import { CnabAdapter } from '../adapters/CnabAdapter';

// ============================================================
// USE CASES - PAYABLES (Contas a Pagar)
// ============================================================
import { CreatePayableUseCase } from '../../application/use-cases/CreatePayableUseCase';
import { GetPayableByIdUseCase } from '../../application/use-cases/GetPayableByIdUseCase';
import { ListPayablesUseCase } from '../../application/use-cases/ListPayablesUseCase';
import { PayAccountPayableUseCase } from '../../application/use-cases/PayAccountPayableUseCase';
import { CancelPayableUseCase } from '../../application/use-cases/CancelPayableUseCase';

// ============================================================
// USE CASES - RECEIVABLES (Contas a Receber)
// ============================================================
import { CreateReceivableUseCase } from '../../application/use-cases/CreateReceivableUseCase';
import { GetReceivableByIdUseCase } from '../../application/use-cases/GetReceivableByIdUseCase';
import { ListReceivablesUseCase } from '../../application/use-cases/ListReceivablesUseCase';
import { ReceivePaymentUseCase } from '../../application/use-cases/ReceivePaymentUseCase';
import { CancelReceivableUseCase } from '../../application/use-cases/CancelReceivableUseCase';

// ============================================================
// USE CASES - FINANCIAL TITLES (Títulos Financeiros)
// ============================================================
import { GeneratePayableTitleUseCase } from '../../application/use-cases/GeneratePayableTitleUseCase';
import { GenerateReceivableTitleUseCase } from '../../application/use-cases/GenerateReceivableTitleUseCase';
import { ReverseTitlesUseCase } from '../../application/use-cases/ReverseTitlesUseCase';

// ============================================================
// USE CASES - EXPENSE REPORTS (Prestação de Contas)
// ============================================================
import { SubmitExpenseReportUseCase } from '../../application/use-cases/expense/SubmitExpenseReportUseCase';
import { ApproveExpenseReportUseCase } from '../../application/use-cases/expense/ApproveExpenseReportUseCase';
import { RejectExpenseReportUseCase } from '../../application/use-cases/expense/RejectExpenseReportUseCase';

// ============================================================
// USE CASES - BANK STATEMENT (Extrato Bancário)
// ============================================================
import { ImportBankStatementUseCase } from '../../application/commands/import-bank-statement/ImportBankStatementUseCase';

// ============================================================
// LOCAL TOKENS (para items não registrados em TOKENS compartilhado)
// ============================================================
export const FINANCIAL_TOKENS = {
  // Gateways
  BillingPdfGateway: Symbol.for('IBillingPdfGateway'),
  BoletoGateway: Symbol.for('IBoletoGateway'),
  CnabGateway: Symbol.for('ICnabGateway'),
  
  // Use Cases - Payables
  CreatePayableUseCase: Symbol.for('CreatePayableUseCase'),
  GetPayableByIdUseCase: Symbol.for('GetPayableByIdUseCase'),
  ListPayablesUseCase: Symbol.for('ListPayablesUseCase'),
  PayAccountPayableUseCase: Symbol.for('PayAccountPayableUseCase'),
  CancelPayableUseCase: Symbol.for('CancelPayableUseCase'),
  
  // Use Cases - Receivables
  CreateReceivableUseCase: Symbol.for('CreateReceivableUseCase'),
  GetReceivableByIdUseCase: Symbol.for('GetReceivableByIdUseCase'),
  ListReceivablesUseCase: Symbol.for('ListReceivablesUseCase'),
  ReceivePaymentUseCase: Symbol.for('ReceivePaymentUseCase'),
  CancelReceivableUseCase: Symbol.for('CancelReceivableUseCase'),
  
  // Use Cases - Expense Reports
  SubmitExpenseReportUseCase: Symbol.for('SubmitExpenseReportUseCase'),
  ApproveExpenseReportUseCase: Symbol.for('ApproveExpenseReportUseCase'),
  RejectExpenseReportUseCase: Symbol.for('RejectExpenseReportUseCase'),
  
  // Receivable Repository (não está em TOKENS compartilhado)
  ReceivableRepository: Symbol.for('ReceivableRepository'),
};

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
  // USE CASES - BANK STATEMENT (Fase 2 - Extrato Bancário)
  // ============================================================
  container.registerSingleton(TOKENS.ImportBankStatementUseCase, ImportBankStatementUseCase);
}
