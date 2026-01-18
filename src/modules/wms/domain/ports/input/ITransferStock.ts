/**
 * Input Port: Transferir Estoque entre Localizações
 *
 * Move estoque de uma localização para outra.
 *
 * Regras de Negócio:
 * - Localizações origem e destino devem existir e estar ativas
 * - Localizações devem ser diferentes
 * - Quantidade disponível na origem deve ser suficiente
 * - Calcula custo médio ponderado no destino
 * - Gera movimentação de transferência
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';
import type {
  TransferStockInput,
  TransferStockOutput,
} from '../../../application/dtos/TransferStockDTO';

/**
 * Interface Input Port: Transferir Estoque
 */
export interface ITransferStock {
  /**
   * Executa transferência de estoque
   *
   * @param input - Dados da transferência (produto, origem, destino, quantidade)
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da transferência ou erro
   */
  execute(
    input: TransferStockInput,
    context: ExecutionContext
  ): Promise<Result<TransferStockOutput, string>>;
}
