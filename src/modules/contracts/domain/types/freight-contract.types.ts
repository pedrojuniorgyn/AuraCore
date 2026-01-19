/**
 * Freight Contract Types
 *
 * Tipos para análise de contratos de frete/transporte.
 *
 * @module contracts/domain/types
 * @see E-Agent-Fase-D5
 */

// ============================================================================
// MAIN CONTRACT
// ============================================================================

/**
 * Contrato de frete analisado.
 */
export interface FreightContractData {
  id: string;
  fileName: string;
  analyzedAt: Date;

  /** Identificação do contrato */
  identification: ContractIdentification;

  /** Partes contratantes */
  parties: ContractParties;

  /** Objeto do contrato */
  object: ContractObject;

  /** Informações financeiras */
  financial: ContractFinancial;

  /** Prazos e vigência */
  terms: ContractTerms;

  /** Penalidades */
  penalties: ContractPenalties;

  /** Seguro */
  insurance: ContractInsurance;

  /** Responsabilidades */
  responsibilities: ContractResponsibilities;

  /** Rescisão */
  termination: ContractTermination;

  /** Análise de risco */
  riskAnalysis: RiskAnalysis;

  /** Metadados da extração */
  extractionMetadata: ExtractionMetadata;
}

// ============================================================================
// IDENTIFICATION
// ============================================================================

export interface ContractIdentification {
  contractNumber?: string;
  contractType: ContractType;
  signatureDate?: Date;
  effectiveDate?: Date;
  expirationDate?: Date;
  autoRenewal: boolean;
  renewalPeriodDays?: number;
}

export type ContractType =
  | 'FRETE_SPOT'
  | 'FRETE_DEDICADO'
  | 'AGREGAMENTO'
  | 'SUBCONTRATACAO'
  | 'ARMAZENAGEM'
  | 'OPERACAO_LOGISTICA'
  | 'OUTROS';

// ============================================================================
// PARTIES
// ============================================================================

export interface ContractParties {
  contractor: ContractParty;
  contracted: ContractParty;
  guarantor?: ContractParty;
  witnesses: ContractParty[];
}

export interface ContractParty {
  role: PartyRole;
  name: string;
  document: string;
  documentType: 'CNPJ' | 'CPF';
  address?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  representative?: PartyRepresentative;
}

export type PartyRole = 'CONTRATANTE' | 'CONTRATADO' | 'FIADOR' | 'TESTEMUNHA';

export interface PartyRepresentative {
  name: string;
  document: string;
  role: string;
}

// ============================================================================
// OBJECT
// ============================================================================

export interface ContractObject {
  description: string;
  serviceType: ServiceType[];
  routes?: ContractRoute[];
  vehicles?: VehicleRequirement[];
  volumeCommitment?: VolumeCommitment;
}

export type ServiceType =
  | 'COLETA'
  | 'ENTREGA'
  | 'TRANSFERENCIA'
  | 'DISTRIBUICAO'
  | 'CROSS_DOCKING'
  | 'MILK_RUN'
  | 'ARMAZENAGEM'
  | 'PICKING'
  | 'PACKING';

export interface ContractRoute {
  origin: string;
  destination: string;
  distance?: number;
  transitTime?: number;
  transitTimeUnit?: 'HORAS' | 'DIAS';
}

export interface VehicleRequirement {
  type: string;
  quantity?: number;
  specifications?: string;
  dedicated: boolean;
}

export interface VolumeCommitment {
  minVolume?: number;
  maxVolume?: number;
  unit: string;
  period: string;
}

// ============================================================================
// FINANCIAL
// ============================================================================

export interface ContractFinancial {
  pricing: PricingModel;
  paymentTerms: PaymentTerms;
  reajustment?: Reajustment;
  additionalCharges?: AdditionalCharge[];
}

export interface PricingModel {
  type: PricingType;
  baseValue?: number;
  currency: string;
  unitValue?: number;
  unit?: string;
  minimumCharge?: number;
  table?: PriceTableItem[];
}

export type PricingType =
  | 'FIXO'
  | 'POR_KM'
  | 'POR_PESO'
  | 'POR_VOLUME'
  | 'TABELA'
  | 'COMPOSTO';

export interface PriceTableItem {
  description: string;
  value: number;
  unit: string;
  conditions?: string;
}

export interface PaymentTerms {
  dueDays: number;
  paymentMethod?: string;
  paymentCondition?: string;
  invoicingPeriod?: string;
  documentRequired?: string[];
}

export interface Reajustment {
  index: string;
  frequency: string;
  baseDate?: Date;
  formula?: string;
}

export interface AdditionalCharge {
  name: string;
  value?: number;
  percentage?: number;
  condition: string;
}

// ============================================================================
// TERMS
// ============================================================================

export interface ContractTerms {
  effectiveDate?: Date;
  expirationDate?: Date;
  durationMonths?: number;
  autoRenewal: boolean;
  renewalNoticeDays?: number;
  trialPeriodDays?: number;
}

// ============================================================================
// PENALTIES
// ============================================================================

export interface ContractPenalties {
  latePayment?: Penalty;
  nonPerformance?: Penalty;
  earlyTermination?: Penalty;
  volumeShortfall?: Penalty;
  other: Penalty[];
}

export interface Penalty {
  description: string;
  type: PenaltyType;
  value?: number;
  percentage?: number;
  baseCalculation?: string;
  cap?: number;
}

export type PenaltyType =
  | 'MULTA_FIXA'
  | 'MULTA_PERCENTUAL'
  | 'JUROS'
  | 'INDENIZACAO';

// ============================================================================
// INSURANCE
// ============================================================================

export interface ContractInsurance {
  required: boolean;
  types: InsuranceTypeDetail[];
  minCoverage?: number;
  responsibleParty: InsuranceResponsible;
  clauses: string[];
}

export type InsuranceResponsible = 'CONTRATANTE' | 'CONTRATADO' | 'AMBOS';

export interface InsuranceTypeDetail {
  type: InsuranceType;
  description: string;
  minValue?: number;
}

export type InsuranceType =
  | 'RCTR_C'
  | 'RCF_DC'
  | 'SEGURO_CARGA'
  | 'SEGURO_VEICULO'
  | 'OUTROS';

// ============================================================================
// RESPONSIBILITIES
// ============================================================================

export interface ContractResponsibilities {
  contractor: string[];
  contracted: string[];
  shared: string[];
  liabilityLimits?: LiabilityLimit[];
}

export interface LiabilityLimit {
  description: string;
  maxValue?: number;
  conditions: string;
}

// ============================================================================
// TERMINATION
// ============================================================================

export interface ContractTermination {
  noticePeriodDays?: number;
  terminationCauses: TerminationCause[];
  earlyTerminationPenalty?: Penalty;
  postTerminationObligations?: string[];
}

export interface TerminationCause {
  cause: string;
  type: TerminationType;
  curePeriodDays?: number;
}

export type TerminationType =
  | 'COM_JUSTA_CAUSA'
  | 'SEM_JUSTA_CAUSA'
  | 'RESCISAO_AUTOMATICA';

// ============================================================================
// RISK ANALYSIS
// ============================================================================

export interface RiskAnalysis {
  overallScore: number;
  riskLevel: RiskLevel;
  alerts: ContractAlert[];
  recommendations: string[];
  complianceChecklist: ComplianceItem[];
}

export type RiskLevel = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface ContractAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  clause?: string;
  recommendation: string;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertCategory =
  | 'FINANCEIRO'
  | 'PRAZO'
  | 'PENALIDADE'
  | 'SEGURO'
  | 'RESPONSABILIDADE'
  | 'RESCISAO'
  | 'COMPLIANCE'
  | 'AMBIGUIDADE';

export interface ComplianceItem {
  item: string;
  status: ComplianceStatus;
  details?: string;
}

export type ComplianceStatus = 'OK' | 'MISSING' | 'INCOMPLETE' | 'NON_COMPLIANT';

// ============================================================================
// EXTRACTION METADATA
// ============================================================================

export interface ExtractionMetadata {
  processingTimeMs: number;
  pageCount: number;
  confidence: number;
  extractedClauses: number;
  warnings: string[];
}
