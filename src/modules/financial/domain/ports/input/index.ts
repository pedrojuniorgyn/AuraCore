/**
 * Barrel export para Input Ports - Financial Module
 * 
 * @see ARCH-010: Use Cases implementam interfaces de domain/ports/input/
 */

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

// Bank Statement Import (Phase D6)
export type {
  IImportBankStatementUseCase,
  ImportBankStatementInput,
  ImportBankStatementOutput,
  PreviewBankStatementInput,
  PreviewBankStatementOutput,
  CategorizeBankTransactionInput,
} from './IImportBankStatementUseCase';
