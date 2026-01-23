/**
 * Input Port: Completar Contagem de Inventário
 *
 * Finaliza uma contagem de inventário com a quantidade contada.
 *
 * Regras de Negócio:
 * - Deve haver contagem em andamento
 * - Quantidade contada pode ser >= 0
 * - Calcula diferença (contada - sistema)
 * - Gera ajuste automático se diferença != 0
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/wms.types';
import type {
  CompleteInventoryCountInput,
  CompleteInventoryCountOutput,
} from '../../types/wms.types';

/**
 * Interface Input Port: Completar Contagem de Inventário
 */
export interface ICompleteInventoryCount {
  /**
   * Executa finalização de contagem
   *
   * @param input - Dados da contagem (produto, localização, quantidade contada)
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da contagem finalizada ou erro
   */
  execute(
    input: CompleteInventoryCountInput,
    context: ExecutionContext
  ): Promise<Result<CompleteInventoryCountOutput, string>>;
}
