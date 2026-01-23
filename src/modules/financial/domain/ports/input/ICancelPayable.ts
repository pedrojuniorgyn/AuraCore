/**
 * Input Port: Cancelar Conta a Pagar
 * 
 * Cancela uma conta a pagar existente.
 * 
 * Regras de Negócio:
 * - Apenas contas com status PENDING podem ser canceladas
 * - Contas parcialmente ou totalmente pagas não podem ser canceladas
 * - Requer permissão 'financial.payables.cancel'
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/payable.types';

export interface CancelPayableInput {
  /** ID da conta a pagar */
  payableId: string;
  
  /** Motivo do cancelamento (obrigatório para auditoria) */
  reason: string;
}

export interface CancelPayableOutput {
  /** ID da conta cancelada */
  id: string;
  
  /** Novo status (CANCELLED) */
  status: string;
  
  /** Data de cancelamento */
  cancelledAt: string;
  
  /** Usuário que cancelou */
  cancelledBy: string;
}

/**
 * Interface Input Port: Cancelar Conta a Pagar
 */
export interface ICancelPayable {
  /**
   * Executa cancelamento de conta a pagar
   * 
   * @param input - Dados do cancelamento (ID, motivo)
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da conta cancelada ou mensagem de erro
   */
  execute(
    input: CancelPayableInput,
    ctx: ExecutionContext
  ): Promise<Result<CancelPayableOutput, string>>;
}
