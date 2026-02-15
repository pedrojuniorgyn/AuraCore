/**
 * Output Ports - Financial Module
 *
 * Interfaces (Ports) para repositórios - implementados pela camada de infraestrutura.
 *
 * @module financial/domain/ports/output
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 * @see E7.26: Reorganização de Output Ports
 */

export type {
  IFinancialTitleRepository,
  FiscalDocumentData,
  AccountPayableInsert,
  AccountReceivableInsert,
  TitleData,
} from './IFinancialTitleRepository';
export type { IPayableRepository, FindPayablesFilter, PaginationOptions, PaginatedResult } from './IPayableRepository';
export type { IReceiptRepository } from './IReceiptRepository';
export type { IExpenseReportRepository } from './IExpenseReportRepository';
export type { IReceivableRepository, ReceivableFilter, ReceivableListResult, ReceivableSummary } from './IReceivableRepository';
export type { IBillingPdfGateway, BillingPdfParams } from './IBillingPdfGateway';
export type { IBoletoGateway, BoletoGenerationParams, BoletoResult } from './IBoletoGateway';
export type { ICnabGateway, CnabGenerationParams, CnabResult } from './ICnabGateway';

// Novos repositories DDD (R1.3)
export type { ICategoryRepository, CategoryFilter } from './ICategoryRepository';
export type { IPaymentTermsRepository, PaymentTermsFilter } from './IPaymentTermsRepository';
export type { IBankAccountRepository, BankAccountFilter } from './IBankAccountRepository';
export type { IBillingRepository, BillingInvoiceFilter } from './IBillingRepository';