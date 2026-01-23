/**
 * Input Port: Gerar Título a Pagar
 * 
 * Gera títulos financeiros a partir de uma conta a pagar (parcelamento).
 * 
 * Regras de Negócio:
 * - Conta a pagar deve existir e estar PENDING
 * - Número de parcelas deve ser >= 1
 * - Soma das parcelas deve igualar o valor total
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/payable.types';

export interface GeneratePayableTitleInput {
  /** ID da conta a pagar */
  payableId: string;
  
  /** Número de parcelas */
  installments: number;
  
  /** Data do primeiro vencimento */
  firstDueDate: string;
  
  /** Intervalo entre parcelas (dias) */
  intervalDays: number;
}

export interface GeneratePayableTitleOutput {
  /** ID da conta a pagar */
  payableId: string;
  
  /** IDs dos títulos gerados */
  titleIds: string[];
  
  /** Número de títulos gerados */
  titlesCount: number;
}

/**
 * Interface Input Port: Gerar Título a Pagar
 */
export interface IGeneratePayableTitle {
  /**
   * Executa geração de títulos a pagar
   * 
   * @param input - Dados da geração (parcelas, vencimentos)
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com IDs dos títulos gerados ou mensagem de erro
   */
  execute(
    input: GeneratePayableTitleInput,
    ctx: ExecutionContext
  ): Promise<Result<GeneratePayableTitleOutput, string>>;
}
