/**
 * Input Port: Gerar Título a Receber
 * 
 * Gera títulos financeiros a partir de uma conta a receber (parcelamento).
 * 
 * Regras de Negócio:
 * - Conta a receber deve existir e estar PENDING
 * - Número de parcelas deve ser >= 1
 * - Soma das parcelas deve igualar o valor total
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from './IPayAccountPayable';

export interface GenerateReceivableTitleInput {
  /** ID da conta a receber */
  receivableId: string;
  
  /** Número de parcelas */
  installments: number;
  
  /** Data do primeiro vencimento */
  firstDueDate: string;
  
  /** Intervalo entre parcelas (dias) */
  intervalDays: number;
}

export interface GenerateReceivableTitleOutput {
  /** ID da conta a receber */
  receivableId: string;
  
  /** IDs dos títulos gerados */
  titleIds: string[];
  
  /** Número de títulos gerados */
  titlesCount: number;
}

/**
 * Interface Input Port: Gerar Título a Receber
 */
export interface IGenerateReceivableTitle {
  /**
   * Executa geração de títulos a receber
   * 
   * @param input - Dados da geração (parcelas, vencimentos)
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com IDs dos títulos gerados ou mensagem de erro
   */
  execute(
    input: GenerateReceivableTitleInput,
    ctx: ExecutionContext
  ): Promise<Result<GenerateReceivableTitleOutput, string>>;
}
