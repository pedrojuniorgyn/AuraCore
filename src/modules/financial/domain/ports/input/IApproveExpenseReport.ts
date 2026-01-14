/**
 * Input Port: Aprovar Relatório de Despesas
 * 
 * Aprova um relatório de despesas submetido por um colaborador.
 * 
 * Regras de Negócio:
 * - Relatório deve estar com status SUBMITTED
 * - Aprovador deve ter permissão 'financial.expenses.approve'
 * - Aprovador não pode aprovar próprio relatório
 * - Após aprovação, gera contas a pagar
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from './IPayAccountPayable';

export interface ApproveExpenseReportInput {
  /** ID do relatório de despesas */
  reportId: string;
  
  /** Comentários do aprovador (opcional) */
  comments?: string;
}

export interface ApproveExpenseReportOutput {
  /** ID do relatório aprovado */
  reportId: string;
  
  /** Novo status (APPROVED) */
  status: string;
  
  /** Data de aprovação */
  approvedAt: string;
  
  /** ID do aprovador */
  approvedBy: string;
  
  /** IDs das contas a pagar geradas */
  payableIds: string[];
}

/**
 * Interface Input Port: Aprovar Relatório de Despesas
 */
export interface IApproveExpenseReport {
  /**
   * Executa aprovação de relatório de despesas
   * 
   * @param input - ID do relatório e comentários
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da aprovação ou mensagem de erro
   */
  execute(
    input: ApproveExpenseReportInput,
    ctx: ExecutionContext
  ): Promise<Result<ApproveExpenseReportOutput, string>>;
}
