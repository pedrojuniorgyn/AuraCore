/**
 * Output Ports - Fiscal Module
 *
 * Interfaces para serviços externos implementados pela camada de infraestrutura.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 * @see E7.26: Reorganização de Output Ports
 */

// ===== REPOSITORIES =====
export type {
  IFiscalDocumentRepository,
  FindFiscalDocumentsFilter,
  PaginationOptions,
  PaginatedResult,
} from './IFiscalDocumentRepository';

export type {
  ITaxRateRepository,
  IBSRegionalRates,
  CBSRates,
  ISRates,
} from './ITaxRateRepository';

export type { ITaxCreditRepository, ChartAccount } from './ITaxCreditRepository';

export type {
  ISpedDataRepository,
  SpedFiscalPeriod,
  OrganizationData,
  PartnerData,
  ProductData,
  InvoiceData,
  CteData,
  ApurationData,
  SpedEcdPeriod,
  ChartAccountData,
  JournalEntryDataEcd,
  JournalEntryLineData,
  AccountBalanceData,
  SpedContributionsPeriod,
  CteContribData,
  NFeContribData,
  TaxTotalsContribData,
} from './ISpedDataRepository';

// ===== EXTERNAL SERVICES =====
export type { IFiscalDocumentPdfGenerator } from './IFiscalDocumentPdfGenerator';
export type {
  ISefazService,
  TransmissionResult,
  AuthorizationResult,
  CancellationResult,
  StatusResult,
} from './ISefazService';

// ===== RAG SYSTEM (E-Agent-Fase-D4) =====
export * from './IEmbedder';
export * from './IVectorStore';
export * from './IAnswerGenerator';
