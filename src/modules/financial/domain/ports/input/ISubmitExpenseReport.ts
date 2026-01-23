/**
 * Input Port: Submeter Relatório de Despesas
 * 
 * Submete um relatório de despesas para aprovação.
 * 
 * Regras de Negócio:
 * - Relatório deve estar com status DRAFT
 * - Deve ter pelo menos 1 despesa
 * - Todas as despesas devem ter comprovante (recibo)
 * - Colaborador só pode submeter próprios relatórios
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/payable.types';

export interface SubmitExpenseReportInput {
  /** ID do relatório de despesas */
  reportId: string;
}

export interface SubmitExpenseReportOutput {
  /** ID do relatório submetido */
  reportId: string;
  
  /** Novo status (SUBMITTED) */
  status: string;
  
  /** Data de submissão */
  submittedAt: string;
  
  /** Total de despesas */
  totalAmount: number;
  
  /** Número de despesas */
  expensesCount: number;
}

/**
 * Interface Input Port: Submeter Relatório de Despesas
 */
export interface ISubmitExpenseReport {
  /**
   * Executa submissão de relatório de despesas
   * 
   * @param input - ID do relatório
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da submissão ou mensagem de erro
   */
  execute(
    input: SubmitExpenseReportInput,
    ctx: ExecutionContext
  ): Promise<Result<SubmitExpenseReportOutput, string>>;
}
