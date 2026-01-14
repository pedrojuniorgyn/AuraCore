/**
 * Input Port: Buscar Conta a Pagar por ID
 * 
 * Consulta uma conta a pagar específica.
 * 
 * Regras de Negócio:
 * - Requer permissão 'financial.payables.read'
 * - Multi-tenancy: só retorna se pertencer à organização+branch
 * - Retorna erro 404 se não encontrar
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from './IPayAccountPayable';
import type { PayableResponseDTO } from '../../../application/dtos/PayableResponseDTO';

export interface GetPayableByIdInput {
  /** ID da conta a pagar */
  payableId: string;
}

/**
 * Interface Input Port: Buscar Conta a Pagar por ID
 */
export interface IGetPayableById {
  /**
   * Executa busca de conta a pagar
   * 
   * @param input - ID da conta
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da conta ou mensagem de erro
   */
  execute(
    input: GetPayableByIdInput,
    ctx: ExecutionContext
  ): Promise<Result<PayableResponseDTO, string>>;
}
