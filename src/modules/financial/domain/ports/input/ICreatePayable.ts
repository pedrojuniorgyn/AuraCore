/**
 * Input Port: Criar Conta a Pagar
 * 
 * Cria uma nova conta a pagar (obrigação financeira com fornecedor).
 * 
 * Regras de Negócio:
 * - Fornecedor deve existir e estar ativo
 * - Valor deve ser positivo
 * - Data de vencimento deve ser futura (ou data atual)
 * - Document number deve ser único por fornecedor
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-001: Domain não importa de Application
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type {
  CreatePayableInput,
  CreatePayableOutput,
  ExecutionContext,
} from '../../types/payable.types';

/**
 * Interface Input Port: Criar Conta a Pagar
 */
export interface ICreatePayable {
  /**
   * Executa criação de conta a pagar
   * 
   * @param input - Dados da conta (fornecedor, valor, vencimento, etc)
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da conta criada ou mensagem de erro
   */
  execute(
    input: CreatePayableInput,
    ctx: ExecutionContext
  ): Promise<Result<CreatePayableOutput, string>>;
}
