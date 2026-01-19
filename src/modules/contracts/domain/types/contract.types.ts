/**
 * Tipos para análise de contratos de frete (D9 - Contract Parser)
 * 
 * Sistema de extração e análise de dados estruturados
 * de contratos de transporte e frete.
 * 
 * NOTA: Alguns tipos têm prefixo 'Parsed' para evitar conflito
 * com tipos existentes em freight-contract.types.ts
 * 
 * @module contracts/domain/types
 * @see Phase D9 - Contract Analysis
 */

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

/**
 * Tipo de contrato identificado pelo parser
 */
export type ParsedContractType =
  | 'FREIGHT_AGREEMENT'     // Contrato de frete (tabela de preços)
  | 'TRANSPORT_SERVICE'     // Contrato de prestação de serviço
  | 'SPOT'                  // Contrato spot (viagem única)
  | 'SUBCONTRACTING'        // Subcontratação de frete
  | 'PARTNERSHIP';          // Parceria comercial

/**
 * Tipo de cláusula contratual
 */
export type ClauseType =
  | 'PAYMENT_TERMS'         // Condições de pagamento
  | 'PRICING'               // Preços e tarifas
  | 'PENALTY'               // Multas e penalidades
  | 'INSURANCE'             // Seguro de carga
  | 'LIABILITY'             // Responsabilidades
  | 'TERMINATION'           // Rescisão
  | 'VALIDITY'              // Vigência
  | 'JURISDICTION'          // Foro
  | 'CONFIDENTIALITY'       // Confidencialidade
  | 'FORCE_MAJEURE'         // Força maior
  | 'OBJECT'                // Objeto do contrato
  | 'OTHER';

/**
 * Papel da parte no contrato (parser)
 */
export type ParsedPartyRole = 
  | 'CONTRACTOR'    // Contratante/Tomador
  | 'CONTRACTED'    // Contratado/Prestador
  | 'WITNESS'       // Testemunha
  | 'GUARANTOR';    // Fiador/Garantidor

/**
 * Tipo de documento da parte (parser)
 */
export type ParsedDocumentType = 'CNPJ' | 'CPF';

/**
 * Método de pagamento
 */
export type PaymentMethod = 
  | 'FATURADO'        // Faturado (a prazo)
  | 'ANTECIPADO'      // Pagamento antecipado
  | 'CONTRA_ENTREGA'  // Contra entrega
  | 'PARCELADO'       // Parcelado
  | 'OUTROS';

/**
 * Tipo de precificação (parser)
 */
export type ParsedPricingType = 
  | 'PER_KG'         // Por quilograma
  | 'PER_VOLUME'     // Por volume (m³)
  | 'PER_TRIP'       // Por viagem
  | 'PER_KM'         // Por quilômetro
  | 'PERCENTAGE'     // Percentual
  | 'FIXED';         // Valor fixo

/**
 * Tipo de seguro de transporte (parser)
 */
export type ParsedInsuranceType = 
  | 'RCF_DC'    // Responsabilidade Civil Facultativa - Desaparecimento de Carga
  | 'RCTR_C'    // Responsabilidade Civil do Transportador Rodoviário de Carga
  | 'RCF_V'     // Responsabilidade Civil Facultativa - Veículo
  | 'OUTROS';

/**
 * Nível de risco identificado (parser)
 */
export type ParsedRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Parte envolvida no contrato (extraída pelo parser)
 */
export interface ParsedContractParty {
  /** Papel no contrato */
  role: ParsedPartyRole;
  
  /** Nome ou razão social */
  name: string;
  
  /** Documento (CNPJ ou CPF) */
  document: string;
  
  /** Tipo do documento */
  documentType: ParsedDocumentType;
  
  /** Endereço (se identificado) */
  address?: string;
  
  /** Contato (se identificado) */
  contact?: string;
}

/**
 * Cláusula contratual extraída
 */
export interface ContractClause {
  /** Tipo da cláusula */
  type: ClauseType;
  
  /** Título ou número da cláusula */
  title: string;
  
  /** Conteúdo textual */
  content: string;
  
  /** Número da cláusula (se identificado) */
  clauseNumber?: string;
  
  /** Dados estruturados extraídos */
  extractedData?: Record<string, unknown>;
  
  /** Confiança da extração (0-1) */
  confidence: number;
}

/**
 * Condições de pagamento
 */
export interface ParsedPaymentTerms {
  /** Método de pagamento */
  method: PaymentMethod;
  
  /** Prazo em dias */
  days?: number;
  
  /** Descrição textual */
  description: string;
  
  /** Dados bancários (se identificados) */
  bankDetails?: {
    bank: string;
    agency: string;
    account: string;
    pix?: string;
  };
}

/**
 * Informações de preço/tarifa
 */
export interface PricingInfo {
  /** Tipo de precificação */
  type: ParsedPricingType;
  
  /** Valor */
  value?: number;
  
  /** Moeda (default: BRL) */
  currency: string;
  
  /** Valor mínimo */
  minimumValue?: number;
  
  /** Descrição */
  description: string;
  
  /** Taxas adicionais */
  additionalFees?: Array<{
    name: string;
    value: number;
    type: 'FIXED' | 'PERCENTAGE';
  }>;
}

/**
 * Informações de seguro (parser)
 */
export interface ParsedInsuranceInfo {
  /** Tipo de seguro */
  type: ParsedInsuranceType;
  
  /** Seguradora */
  provider?: string;
  
  /** Número da apólice */
  policyNumber?: string;
  
  /** Valor de cobertura */
  coverageValue?: number;
  
  /** Descrição */
  description: string;
}

/**
 * Informações de vigência
 */
export interface ContractValidity {
  /** Data de início */
  startDate?: Date;
  
  /** Data de término */
  endDate?: Date;
  
  /** Renovação automática */
  autoRenewal?: boolean;
  
  /** Termos de renovação */
  renewalTerms?: string;
}

/**
 * Risco identificado no contrato
 */
export interface ContractRisk {
  /** Nível de risco */
  type: ParsedRiskLevel;
  
  /** Descrição do risco */
  description: string;
  
  /** Cláusula relacionada */
  clause?: string;
}

/**
 * Resultado completo da análise de contrato (D9 Parser)
 */
export interface ContractAnalysisResult {
  /** Tipo de contrato identificado */
  contractType: ParsedContractType;
  
  /** Partes envolvidas */
  parties: ParsedContractParty[];
  
  /** Cláusulas extraídas */
  clauses: ContractClause[];
  
  /** Vigência */
  validity: ContractValidity;
  
  /** Condições de pagamento */
  paymentTerms?: ParsedPaymentTerms;
  
  /** Informações de preço */
  pricing?: PricingInfo[];
  
  /** Seguro */
  insurance?: ParsedInsuranceInfo;
  
  /** Foro/Jurisdição */
  jurisdiction?: string;
  
  /** Valor total do contrato */
  totalValue?: number;
  
  /** Riscos identificados */
  risks: ContractRisk[];
  
  /** Confiança geral da análise (0-1) */
  confidence: number;
  
  /** Texto original */
  rawText: string;
  
  /** Data/hora da extração */
  extractedAt: Date;
}
