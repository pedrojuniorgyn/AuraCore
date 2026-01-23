/**
 * Input Port: Registrar Entrada de Estoque
 *
 * Registra entrada de produtos no estoque.
 *
 * Regras de Negócio:
 * - Localização deve existir e estar ativa
 * - Quantidade deve ser positiva
 * - Atualiza custo médio ponderado
 * - Gera movimentação de entrada
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/wms.types';
import type {
  RegisterStockEntryInput,
  RegisterStockEntryOutput,
} from '../../types/wms.types';

/**
 * Interface Input Port: Registrar Entrada de Estoque
 */
export interface IRegisterStockEntry {
  /**
   * Executa entrada de estoque
   *
   * @param input - Dados da entrada (produto, localização, quantidade, custo)
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da entrada ou erro
   */
  execute(
    input: RegisterStockEntryInput,
    context: ExecutionContext
  ): Promise<Result<RegisterStockEntryOutput, string>>;
}
