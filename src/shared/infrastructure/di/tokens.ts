export const TOKENS = {
  // Repositories - Financial
  PayableRepository: Symbol('PayableRepository'),
  ReceivableRepository: Symbol('ReceivableRepository'),
  BankAccountRepository: Symbol('BankAccountRepository'),
  
  // Repositories - Accounting
  JournalEntryRepository: Symbol('JournalEntryRepository'),
  ChartOfAccountsRepository: Symbol('ChartOfAccountsRepository'),
  
  // Repositories - Fiscal
  FiscalDocumentRepository: Symbol('FiscalDocumentRepository'),
  
  // Use Cases - Fiscal
  CreateFiscalDocumentUseCase: Symbol('CreateFiscalDocumentUseCase'),
  SubmitFiscalDocumentUseCase: Symbol('SubmitFiscalDocumentUseCase'),
  AuthorizeFiscalDocumentUseCase: Symbol('AuthorizeFiscalDocumentUseCase'),
  CancelFiscalDocumentUseCase: Symbol('CancelFiscalDocumentUseCase'),
  CalculateTaxesUseCase: Symbol('CalculateTaxesUseCase'),
  
  // Services - Fiscal
  SefazService: Symbol('SefazService'),
  FiscalDocumentPdfGenerator: Symbol('FiscalDocumentPdfGenerator'),
  FiscalAccountingIntegration: Symbol('FiscalAccountingIntegration'),
  
  // Gateways
  BtgGateway: Symbol('BtgGateway'),
  SefazGateway: Symbol('SefazGateway'),
  
  // Infrastructure
  UnitOfWork: Symbol('UnitOfWork'),
  EventDispatcher: Symbol('EventDispatcher'),
} as const;
