/**
 * Barrel export para Input Ports - Financial Module
 * 
 * @see ARCH-010: Use Cases implementam interfaces de domain/ports/input/
 */

// Domain Types (re-export for backward compatibility)
export type { ExecutionContext } from '../../types/payable.types';

// Payables
export * from './IPayAccountPayable';
export * from './ICancelPayable';
export * from './ICreatePayable';
export * from './IGetPayableById';
export * from './IListPayables';

// Receivables
export * from './ICreateReceivable';
export * from './IGetReceivableById';
export * from './IListReceivables';
export * from './ICancelReceivable';
export * from './IReceivePayment';

// Titles
export * from './IGeneratePayableTitle';
export * from './IGenerateReceivableTitle';
export * from './IReverseTitles';

// Expense Reports
export * from './IApproveExpenseReport';
export * from './IRejectExpenseReport';
export * from './ISubmitExpenseReport';

// F2.3: Billing Use Cases
export * from './IBillingUseCases';

// F2.2: Receivable behaviors
export * from './IUpdateReceivable';
export * from './IPartialPayment';

// F2.1: Payable behaviors
export * from './IUpdatePayable';
export * from './ISplitPayable';
export * from './IReschedulePayable';

// NFe/CTe -> Payable (F0.5.2, F0.5.3)
export * from './ICreatePayablesFromNFe';
export * from './ICreatePayableFromExternalCTe';

// F2.4: Categories
export * from './ICategoryUseCases';

// F2.4: Cost Centers
export * from './ICostCenterUseCases';

// F2.4: Bank Accounts
export * from './IBankAccountUseCases';

// F2.4: Reporting
export * from './ICashFlowUseCases';
export * from './IDreUseCases';

// Bank Statement Import (Phase D6)
export type {
  IImportBankStatementUseCase,
  ImportBankStatementInput,
  ImportBankStatementOutput,
  PreviewBankStatementInput,
  PreviewBankStatementOutput,
  CategorizeBankTransactionInput,
} from './IImportBankStatementUseCase';
