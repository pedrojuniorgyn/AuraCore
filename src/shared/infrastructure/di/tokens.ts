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
  
  // Gateways
  BtgGateway: Symbol('BtgGateway'),
  SefazGateway: Symbol('SefazGateway'),
  
  // Infrastructure
  UnitOfWork: Symbol('UnitOfWork'),
  EventDispatcher: Symbol('EventDispatcher'),
} as const;
