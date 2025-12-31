import { Money } from '@/shared/domain';

/**
 * SplitPaymentTypes: Tipos e enums para Split Payment
 * 
 * E7.4.1 Semana 10 - Integração Final + E2E Tests
 * 
 * Contexto: Split Payment será obrigatório a partir de 2027
 * Esta é a estrutura preparatória (tipos e enums)
 * 
 * Referência: EC 132/2023, LC 214/2025
 */

/**
 * Status do Split Payment
 */
export type SplitPaymentStatus = 
  | 'PENDING'      // Aguardando processamento
  | 'PROCESSING'   // Em processamento pela instituição financeira
  | 'COMPLETED'    // Pagamento dividido e processado com sucesso
  | 'FAILED';      // Falha no processamento

/**
 * Tipos de tributo para Split Payment
 */
export type TributoSplit = 
  | 'IBS_UF'       // IBS - Parcela UF
  | 'IBS_MUN'      // IBS - Parcela Municipal
  | 'CBS'          // Contribuição sobre Bens e Serviços
  | 'IS';          // Imposto Seletivo (opcional)

/**
 * Tipo de destinatário do Split Payment
 */
export type SplitRecipientType = 
  | 'FEDERAL'      // União (CBS)
  | 'ESTADUAL'     // Estado (IBS UF)
  | 'MUNICIPAL';   // Município (IBS Municipal)

/**
 * Tipo de operação fiscal
 */
export type OperationType = 
  | 'SALE'         // Venda
  | 'PURCHASE'     // Compra
  | 'TRANSFER'     // Transferência
  | 'RETURN'       // Devolução
  | 'SERVICE';     // Prestação de serviço

/**
 * Detalhamento da divisão de tributos
 */
export interface TaxBreakdown {
  /** IBS - Parcela UF */
  ibsUf: Money;
  
  /** IBS - Parcela Municipal */
  ibsMun: Money;
  
  /** Contribuição sobre Bens e Serviços */
  cbs: Money;
  
  /** Imposto Seletivo (opcional) */
  is?: Money;
}

/**
 * Dados bancários do destinatário
 */
export interface BankAccount {
  /** Código do banco (3 dígitos) */
  bankCode: string;
  
  /** Agência (com ou sem dígito) */
  agency: string;
  
  /** Conta (com ou sem dígito) */
  account: string;
  
  /** Tipo de conta */
  accountType: 'CHECKING' | 'SAVINGS';
  
  /** Chave PIX (opcional) */
  pixKey?: string;
}

/**
 * Destinatário do Split Payment
 */
export interface SplitRecipient {
  /** Tipo do destinatário */
  type: SplitRecipientType;
  
  /** Código do ente (UF: 2 dígitos, Município: 7 dígitos) */
  code: string;
  
  /** Nome do destinatário */
  name: string;
  
  /** CNPJ do destinatário (14 dígitos) */
  cnpj: string;
  
  /** Dados bancários (opcional, pode ser informado posteriormente) */
  account?: BankAccount;
}

/**
 * Instrução de Split Payment
 */
export interface SplitInstruction {
  /** Destinatário do split */
  recipient: SplitRecipient;
  
  /** Valor a ser direcionado */
  amount: Money;
  
  /** Tipo de tributo */
  tributo: TributoSplit;
  
  /** Referência do documento fiscal */
  reference: string;
  
  /** Data de vencimento */
  dueDate: Date;
  
  /** Código de barras (gerado pela instituição financeira) */
  barcode?: string;
  
  /** Linha digitável (gerado pela instituição financeira) */
  digitableLine?: string;
}

/**
 * Instrução de pagamento para instituição financeira
 */
export interface PaymentInstruction {
  /** Chave PIX (se disponível) */
  pixKey?: string;
  
  /** Código do banco */
  bankCode?: string;
  
  /** Agência */
  agency?: string;
  
  /** Conta */
  account?: string;
  
  /** Valor do pagamento */
  amount: Money;
  
  /** Referência (número do documento fiscal) */
  reference: string;
  
  /** Data de vencimento */
  dueDate: Date;
  
  /** Tipo de tributo */
  tributo: TributoSplit;
  
  /** Código de barras (quando gerado) */
  barcode?: string;
}

/**
 * Resultado da validação de requisito de Split Payment
 */
export interface SplitRequirementResult {
  /** Se split payment é obrigatório */
  required: boolean;
  
  /** Motivo da obrigatoriedade */
  reason: string;
  
  /** Data a partir da qual é obrigatório */
  mandatoryFrom?: Date;
}

/**
 * Resumo do Split Payment
 */
export interface SplitPaymentSummary {
  /** Valor total */
  totalAmount: Money;
  
  /** Total de instruções de split */
  totalInstructions: number;
  
  /** Valor por tipo de tributo */
  breakdownByTributo: Map<TributoSplit, Money>;
  
  /** Valor por destinatário */
  breakdownByRecipient: Map<string, Money>;
  
  /** Status geral */
  status: SplitPaymentStatus;
}

