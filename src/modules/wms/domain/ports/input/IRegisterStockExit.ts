/**
 * Input Port: Registrar Saída de Estoque
 *
 * Registra saída de produtos do estoque.
 *
 * Regras de Negócio:
 * - Localização deve existir e estar ativa
 * - Quantidade disponível deve ser suficiente
 * - Gera movimentação de saída
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';
import type {
  RegisterStockExitInput,
  RegisterStockExitOutput,
} from '../../../application/dtos/RegisterStockExitDTO';

/**
 * Interface Input Port: Registrar Saída de Estoque
 */
export interface IRegisterStockExit {
  /**
   * Executa saída de estoque
   *
   * @param input - Dados da saída (produto, localização, quantidade)
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da saída ou erro
   */
  execute(
    input: RegisterStockExitInput,
    context: ExecutionContext
  ): Promise<Result<RegisterStockExitOutput, string>>;
}
