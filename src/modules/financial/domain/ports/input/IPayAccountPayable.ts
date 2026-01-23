/**
 * Input Port: Pagar Conta a Pagar
 * 
 * Registra um pagamento para uma conta a pagar existente.
 * 
 * Regras de Negócio:
 * - Apenas contas com status PENDING ou PARTIALLY_PAID podem receber pagamento
 * - Requer permissão 'financial.payables.pay'
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * - Pagamento não pode exceder o saldo restante
 * 
 * @see ARCH-001: Domain não importa de Application
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type {
  PayAccountPayableInput,
  PayAccountPayableOutput,
  ExecutionContext,
} from '../../types/payable.types';

/**
 * Interface Input Port: Pagar Conta a Pagar
 */
export interface IPayAccountPayable {
  /**
   * Executa pagamento de conta a pagar
   * 
   * @param input - Dados do pagamento (ID, valor, método, etc)
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados do pagamento ou mensagem de erro
   */
  execute(
    input: PayAccountPayableInput,
    ctx: ExecutionContext
  ): Promise<Result<PayAccountPayableOutput, string>>;
}
