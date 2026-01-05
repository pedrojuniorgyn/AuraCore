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
}

