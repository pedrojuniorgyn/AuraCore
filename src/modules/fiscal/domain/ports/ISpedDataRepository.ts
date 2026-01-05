/**
 * 📄 SPED DATA REPOSITORY PORT
 * 
 * Interface defining the contract for SPED data retrieval
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { Result } from "@/shared/domain";

// ============================================================================
// Types para dados de entrada
// ============================================================================

export interface SpedFiscalPeriod {
  organizationId: bigint;
  referenceMonth: number;  // 1-12
  referenceYear: number;
  finality: 'ORIGINAL' | 'SUBSTITUTION';
}

// ============================================================================
// Types para dados de retorno
// ============================================================================

export interface OrganizationData {
  name: string;
  document: string;  // CNPJ
}

export interface PartnerData {
  document: string;
  legalName: string | null;
  fantasyName: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
}

export interface ProductData {
  id: bigint;
  code: string;
  name: string;
  ncm: string | null;
  unit: string | null;
}

export interface InvoiceData {
  documentNumber: string;
  accessKey: string;
  issueDate: Date;
  partnerDocument: string;
  model: string;
  series: string;
  cfop: string;
  totalAmount: number;
  taxAmount: number | null;
  icmsBase: number | null;
  icmsAmount: number | null;
}

export interface CteData {
  cteNumber: string;
  accessKey: string;
  issueDate: Date;
  customerDocument: string;
  cfop: string;
  totalAmount: number;
  icmsAmount: number | null;
}

export interface ApurationData {
  icmsDebit: number;
  icmsCredit: number;
}

// ============================================================================
// Types para SPED ECD (Contábil)
// ============================================================================

export interface SpedEcdPeriod {
  organizationId: bigint;
  referenceYear: number;
  bookType: 'G' | 'R'; // G = Livro Geral, R = Livro Razão Auxiliar
}

export interface ChartAccountData {
  code: string;
  name: string;
  type: string; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  parentCode: string | null;
  isAnalytical: boolean;
}

export interface JournalEntryDataEcd {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
}

export interface JournalEntryLineData {
  lineNumber: number;
  accountCode: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
}

export interface AccountBalanceData {
  code: string;
  totalDebit: number;
  totalCredit: number;
}

// ============================================================================
// Types para SPED Contributions (PIS/COFINS)
// ============================================================================

export interface SpedContributionsPeriod {
  organizationId: bigint;
  referenceMonth: number; // 1-12
  referenceYear: number;
  finality: 'ORIGINAL' | 'SUBSTITUTION';
}

export interface CteContribData {
  cteNumber: string;
  accessKey: string;
  issueDate: Date;
  customerDocument: string;
  cfop: string;
  totalAmount: number;
  icmsAmount: number;
}

export interface NFeContribData {
  documentNumber: string;
  accessKey: string;
  issueDate: Date;
  partnerDocument: string;
  netAmount: number;
  cfop: string;
}

export interface TaxTotalsContribData {
  totalDebit: number;
  totalCredit: number;
}

// ============================================================================
// Repository Interface
// ============================================================================

export interface ISpedDataRepository {
  /**
   * Busca dados da organização
   */
  getOrganization(organizationId: bigint): Promise<Result<OrganizationData, Error>>;

  /**
   * Busca parceiros (fornecedores/clientes) que participaram no período
   */
  getPartners(period: SpedFiscalPeriod): Promise<Result<PartnerData[], Error>>;

  /**
   * Busca produtos/serviços movimentados no período
   */
  getProducts(period: SpedFiscalPeriod): Promise<Result<ProductData[], Error>>;

  /**
   * Busca notas fiscais de entrada no período
   */
  getInvoices(period: SpedFiscalPeriod): Promise<Result<InvoiceData[], Error>>;

  /**
   * Busca CTes (Conhecimentos de Transporte) no período
   */
  getCtes(period: SpedFiscalPeriod): Promise<Result<CteData[], Error>>;

  /**
   * Busca dados de apuração de ICMS no período
   */
  getApuration(period: SpedFiscalPeriod): Promise<Result<ApurationData, Error>>;

  // ============================================================================
  // Métodos para SPED ECD (Contábil)
  // ============================================================================

  /**
   * Busca plano de contas da organização
   */
  getChartOfAccounts(period: SpedEcdPeriod): Promise<Result<ChartAccountData[], Error>>;

  /**
   * Busca lançamentos contábeis do período
   */
  getJournalEntries(period: SpedEcdPeriod): Promise<Result<JournalEntryDataEcd[], Error>>;

  /**
   * Busca linhas (partidas) de um lançamento contábil
   */
  getJournalEntryLines(entryId: string, period: SpedEcdPeriod): Promise<Result<JournalEntryLineData[], Error>>;

  /**
   * Busca saldos das contas no período
   */
  getAccountBalances(period: SpedEcdPeriod): Promise<Result<AccountBalanceData[], Error>>;

  // ============================================================================
  // Métodos para SPED Contributions (PIS/COFINS)
  // ============================================================================

  /**
   * Busca CTes de saída do período (receitas)
   */
  getCtesForContributions(period: SpedContributionsPeriod): Promise<Result<CteContribData[], Error>>;

  /**
   * Busca NFes de entrada do período (créditos)
   */
  getNFesEntradaForContributions(period: SpedContributionsPeriod): Promise<Result<NFeContribData[], Error>>;

  /**
   * Busca totais de débito e crédito de PIS/COFINS do período
   */
  getTaxTotalsContributions(period: SpedContributionsPeriod): Promise<Result<TaxTotalsContribData, Error>>;
}

