/**
 * 📋 FINANCIAL_TOKENS - DI Token Registry
 * 
 * Extraído de FinancialModule.ts para evitar dependências circulares.
 * Use Cases que precisam de @inject(FINANCIAL_TOKENS.xxx) devem importar daqui.
 */

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
  
  // Use Cases - Billing
  FinalizeBillingInvoiceUseCase: Symbol.for('FinalizeBillingInvoiceUseCase'),

  // Use Cases - NFe/CTe -> Payable (F0.5.2, F0.5.3)
  CreatePayablesFromNFeUseCase: Symbol.for('CreatePayablesFromNFeUseCase'),
  CreatePayableFromExternalCTeUseCase: Symbol.for('CreatePayableFromExternalCTeUseCase'),
  
  // Use Cases - Payable F2.1
  UpdatePayableUseCase: Symbol.for('UpdatePayableUseCase'),
  SplitPayableUseCase: Symbol.for('SplitPayableUseCase'),
  ReschedulePayableUseCase: Symbol.for('ReschedulePayableUseCase'),
  
  // Use Cases - Receivable F2.2
  UpdateReceivableUseCase: Symbol.for('UpdateReceivableUseCase'),
  PartialPaymentUseCase: Symbol.for('PartialPaymentUseCase'),
  
  // F2.4: Categories
  ListCategoriesUseCase: Symbol.for('ListCategoriesUseCase'),
  CreateCategoryUseCase: Symbol.for('CreateCategoryUseCase'),
  UpdateCategoryUseCase: Symbol.for('UpdateCategoryUseCase'),
  DeleteCategoryUseCase: Symbol.for('DeleteCategoryUseCase'),

  // F2.4: Cost Centers
  ListCostCentersUseCase: Symbol.for('ListCostCentersUseCase'),
  GetCostCenterByIdUseCase: Symbol.for('GetCostCenterByIdUseCase'),
  CreateCostCenterUseCase: Symbol.for('CreateCostCenterUseCase'),
  UpdateCostCenterUseCase: Symbol.for('UpdateCostCenterUseCase'),
  DeleteCostCenterUseCase: Symbol.for('DeleteCostCenterUseCase'),

  // F2.4: Bank Accounts
  ListBankAccountsUseCase: Symbol.for('ListBankAccountsUseCase'),
  CreateBankAccountUseCase: Symbol.for('CreateBankAccountUseCase'),
  UpdateBankAccountUseCase: Symbol.for('UpdateBankAccountUseCase'),

  // F2.4: Reporting
  GetCashFlowUseCase: Symbol.for('GetCashFlowUseCase'),
  GetDreUseCase: Symbol.for('GetDreUseCase'),

  // Billing F2.3
  CreateBillingInvoiceUseCase: Symbol.for('CreateBillingInvoiceUseCase'),
  UpdateBillingInvoiceUseCase: Symbol.for('UpdateBillingInvoiceUseCase'),
  CancelBillingInvoiceUseCase: Symbol.for('CancelBillingInvoiceUseCase'),
  SendBillingInvoiceUseCase: Symbol.for('SendBillingInvoiceUseCase'),
  ListBillingInvoicesUseCase: Symbol.for('ListBillingInvoicesUseCase'),
  GetBillingInvoiceByIdUseCase: Symbol.for('GetBillingInvoiceByIdUseCase'),
  GenerateBillingPdfUseCase: Symbol.for('GenerateBillingPdfUseCase'),
  
  // Receivable Repository (não está em TOKENS compartilhado)
  ReceivableRepository: Symbol.for('ReceivableRepository'),

  // F4: Cross-Module Integration
  CreatePayableFromTripUseCase: Symbol.for('CreatePayableFromTripUseCase'),
  CreateDriverReceiptUseCase: Symbol.for('CreateDriverReceiptUseCase'),

  // F6: Auto Reconciliation
  AutoReconcileUseCase: Symbol.for('AutoReconcileUseCase'),

  // R1.3: Repositories DDD
  CategoryRepository: Symbol.for('ICategoryRepository'),
  PaymentTermsRepository: Symbol.for('IPaymentTermsRepository'),
  BankAccountRepository: Symbol.for('IBankAccountRepository'),
  BillingRepository: Symbol.for('IBillingRepository'),
};
