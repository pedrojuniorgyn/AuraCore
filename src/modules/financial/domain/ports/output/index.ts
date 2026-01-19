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

