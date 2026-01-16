/**
 * Dependency Injection Tokens
 * 
 * Central registry for DI tokens using Symbol
 */

export const TOKENS = {
  // Shared Infrastructure
  EventDispatcher: Symbol('EventDispatcher'),
  UuidGenerator: Symbol('UuidGenerator'),

  // Financial Module
  PayableRepository: Symbol('PayableRepository'),
  ExpenseReportRepository: Symbol('ExpenseReportRepository'),
  ExpensePolicyService: Symbol('ExpensePolicyService'),
  ReceiptRepository: Symbol('ReceiptRepository'),
  ReceiptNumberGenerator: Symbol('ReceiptNumberGenerator'),

  // Accounting Module
  JournalEntryRepository: Symbol('JournalEntryRepository'),

  // Fiscal Module - Repositories & Services
  FiscalDocumentRepository: Symbol('FiscalDocumentRepository'),
  SefazService: Symbol('SefazService'),
  FiscalDocumentPdfGenerator: Symbol('FiscalDocumentPdfGenerator'),
  FiscalAccountingIntegration: Symbol('FiscalAccountingIntegration'),
  
  // Fiscal Module - Use Cases
  CreateFiscalDocumentUseCase: Symbol('CreateFiscalDocumentUseCase'),
  ListFiscalDocumentsUseCase: Symbol('ListFiscalDocumentsUseCase'),
  GetFiscalDocumentByIdUseCase: Symbol('GetFiscalDocumentByIdUseCase'),
  SubmitFiscalDocumentUseCase: Symbol('SubmitFiscalDocumentUseCase'),
  AuthorizeFiscalDocumentUseCase: Symbol('AuthorizeFiscalDocumentUseCase'),
  CancelFiscalDocumentUseCase: Symbol('CancelFiscalDocumentUseCase'),
  ValidateFiscalDocumentUseCase: Symbol('ValidateFiscalDocumentUseCase'),
  CalculateTaxesUseCase: Symbol('CalculateTaxesUseCase'),
  GenerateDanfeUseCase: Symbol('GenerateDanfeUseCase'),
  TransmitToSefazUseCase: Symbol('TransmitToSefazUseCase'),
  QuerySefazStatusUseCase: Symbol('QuerySefazStatusUseCase'),
  
  // Fiscal Module - SPED Use Cases (E7.18 Fase 3)
  GenerateSpedFiscalUseCase: Symbol('GenerateSpedFiscalUseCase'),
  GenerateSpedEcdUseCase: Symbol('GenerateSpedEcdUseCase'),
  GenerateSpedContributionsUseCase: Symbol('GenerateSpedContributionsUseCase'),
  SpedDataRepository: Symbol('SpedDataRepository'),

  // WMS Module - E7.8 Semana 2
  LocationRepository: Symbol('LocationRepository'),
  StockRepository: Symbol('StockRepository'),
  MovementRepository: Symbol('MovementRepository'),
  InventoryCountRepository: Symbol('InventoryCountRepository'),

  // Integrations Module - E7.9 Semana 1
  SefazGateway: Symbol('SefazGateway'),
  BankingGateway: Symbol('BankingGateway'),
  NotificationService: Symbol('NotificationService'),
  BankStatementParser: Symbol('BankStatementParser'),
} as const;
