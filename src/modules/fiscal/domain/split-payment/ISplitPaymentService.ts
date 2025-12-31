import { Money } from '@/shared/domain';
import {
  TaxBreakdown,
  SplitInstruction,
  PaymentInstruction,
  OperationType,
  SplitRequirementResult,
  SplitPaymentSummary,
} from './SplitPaymentTypes';

/**
 * ISplitPaymentService: Interface para Split Payment Service
 * 
 * E7.4.1 Semana 10 - Integração Final + E2E Tests
 * 
 * Contexto: Split Payment será obrigatório a partir de 2027
 * Esta é a estrutura preparatória (interface)
 * 
 * Em 2027: implementar integração real com instituições financeiras
 * 
 * Referência: EC 132/2023, LC 214/2025
 */

export interface ISplitPaymentService {
  /**
   * Calcula a divisão do pagamento entre tributos
   * 
   * @param totalAmount Valor total do pagamento
   * @param taxBreakdown Detalhamento dos tributos
   * @param reference Referência do documento fiscal
   * @param dueDate Data de vencimento
   * @param uf UF de destino
   * @param municipio Código do município de destino (7 dígitos)
   * @returns Instruções de split por destinatário
   * 
   * @example
   * ```typescript
   * const instructions = await splitService.calculateSplit(
   *   Money.create(1000, 'BRL').value,
   *   { ibsUf: ..., ibsMun: ..., cbs: ... },
   *   'CT-e 12345',
   *   new Date('2027-01-15'),
   *   'SP',
   *   '3550308'
   * );
   * ```
   */
  calculateSplit(
    totalAmount: Money,
    taxBreakdown: TaxBreakdown,
    reference: string,
    dueDate: Date,
    uf: string,
    municipio: string
  ): Promise<SplitInstruction[]>;

  /**
   * Valida se split payment é obrigatório para a operação
   * 
   * @param operationDate Data da operação
   * @param operationType Tipo de operação
   * @param totalAmount Valor total da operação
   * @returns Resultado da validação de obrigatoriedade
   * 
   * @example
   * ```typescript
   * const requirement = splitService.isSplitRequired(
   *   new Date('2027-01-15'),
   *   'SALE',
   *   Money.create(10000, 'BRL').value
   * );
   * 
   * if (requirement.required) {
   *   console.log('Split obrigatório:', requirement.reason);
   * }
   * ```
   */
  isSplitRequired(
    operationDate: Date,
    operationType: OperationType,
    totalAmount: Money
  ): SplitRequirementResult;

  /**
   * Gera instruções de pagamento para instituição financeira
   * 
   * @param split Instruções de split calculadas
   * @returns Instruções de pagamento formatadas
   * 
   * @example
   * ```typescript
   * const paymentInstructions = await splitService.generatePaymentInstructions(splitInstructions);
   * 
   * for (const instruction of paymentInstructions) {
   *   console.log(`Pagar ${instruction.amount} para ${instruction.pixKey || instruction.bankCode}`);
   * }
   * ```
   */
  generatePaymentInstructions(split: SplitInstruction[]): Promise<PaymentInstruction[]>;

  /**
   * Valida se as instruções de split estão corretas
   * 
   * @param split Instruções de split
   * @param totalAmount Valor total esperado
   * @returns true se válido, false caso contrário
   */
  validateSplit(split: SplitInstruction[], totalAmount: Money): boolean;

  /**
   * Gera resumo do split payment
   * 
   * @param split Instruções de split
   * @returns Resumo consolidado
   */
  generateSummary(split: SplitInstruction[]): SplitPaymentSummary;

  /**
   * Obtém destinatários cadastrados para um ente
   * 
   * @param uf UF do destinatário (para IBS UF)
   * @param municipio Código do município (para IBS Municipal)
   * @returns Lista de destinatários disponíveis
   */
  getRecipients(uf?: string, municipio?: string): Promise<Array<{
    type: string;
    code: string;
    name: string;
    cnpj: string;
    pixKey?: string;
  }>>;
}

