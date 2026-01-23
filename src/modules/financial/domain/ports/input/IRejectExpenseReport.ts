/**
 * Input Port: Rejeitar Relatório de Despesas
 * 
 * Rejeita um relatório de despesas submetido por um colaborador.
 * 
 * Regras de Negócio:
 * - Relatório deve estar com status SUBMITTED
 * - Rejeitor deve ter permissão 'financial.expenses.approve'
 * - Rejeitor não pode rejeitar próprio relatório
 * - Motivo de rejeição é obrigatório
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/payable.types';

export interface RejectExpenseReportInput {
  /** ID do relatório de despesas */
  reportId: string;
  
  /** Motivo da rejeição (obrigatório) */
  reason: string;
}

export interface RejectExpenseReportOutput {
  /** ID do relatório rejeitado */
  reportId: string;
  
  /** Novo status (REJECTED) */
  status: string;
  
  /** Data de rejeição */
  rejectedAt: string;
  
  /** ID do rejeitor */
  rejectedBy: string;
}

/**
 * Interface Input Port: Rejeitar Relatório de Despesas
 */
export interface IRejectExpenseReport {
  /**
   * Executa rejeição de relatório de despesas
   * 
   * @param input - ID do relatório e motivo
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da rejeição ou mensagem de erro
   */
  execute(
    input: RejectExpenseReportInput,
    ctx: ExecutionContext
  ): Promise<Result<RejectExpenseReportOutput, string>>;
}
