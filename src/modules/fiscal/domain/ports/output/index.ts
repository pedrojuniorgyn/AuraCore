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

// ===== DACTE GENERATOR (E8 Fase 2.3) =====
export type { IDacteGenerator } from './IDacteGenerator';

// ===== GATEWAYS (E9 Fase 2) =====
export type {
  ITaxCalculatorGateway,
  TaxCalculationParams,
  TaxMatrixResult,
  IcmsCalculationParams,
  IcmsCalculationResult,
} from './ITaxCalculatorGateway';

export type {
  IFiscalClassificationGateway,
  ClassificationParams,
  ClassificationResult,
} from './IFiscalClassificationGateway';

export type {
  IPcgNcmGateway,
  PcgNcmParams,
  FiscalFlagsResult,
} from './IPcgNcmGateway';

// ===== CTe LEGACY ADAPTERS (Diagnostic Plan - Fase 3) =====
export type { ICteBuilderService, CteBuilderInput } from './ICteBuilderService';
export type { IXmlSignerService, CertificateInfo } from './IXmlSignerService';
export type { IInsuranceValidatorService } from './IInsuranceValidatorService';

// ===== CERTIFICATE & SEFAZ CLIENT (E10.3) =====
export type {
  ICertificateManagerService,
  CertificateManagerInfo,
} from './ICertificateManagerService';
export type {
  ISefazClientService,
  SefazTransmissionResult,
  SefazStatusResult,
} from './ISefazClientService';
