/**
 * Input Port: Iniciar Contagem de Inventário
 *
 * Inicia uma contagem de inventário para um produto em uma localização.
 *
 * Regras de Negócio:
 * - Produto deve existir no estoque da localização
 * - Não pode haver contagem em andamento
 * - Registra quantidade do sistema no momento
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/wms.types';
import type {
  StartInventoryCountInput,
  StartInventoryCountOutput,
} from '../../types/wms.types';

/**
 * Interface Input Port: Iniciar Contagem de Inventário
 */
export interface IStartInventoryCount {
  /**
   * Executa início de contagem
   *
   * @param input - Dados da contagem (produto, localização)
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da contagem iniciada ou erro
   */
  execute(
    input: StartInventoryCountInput,
    context: ExecutionContext
  ): Promise<Result<StartInventoryCountOutput, string>>;
}
