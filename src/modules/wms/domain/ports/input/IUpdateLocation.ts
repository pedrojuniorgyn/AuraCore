/**
 * Input Port: Atualizar Localização
 *
 * Atualiza dados de uma localização existente.
 *
 * Regras de Negócio:
 * - Localização deve existir
 * - Código não pode ser alterado
 * - Tipo não pode ser alterado
 * - Multi-tenancy: validação de branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';
import type {
  UpdateLocationInput,
  UpdateLocationOutput,
} from '../../../application/dtos/UpdateLocationDTO';

/**
 * Interface Input Port: Atualizar Localização
 */
export interface IUpdateLocation {
  /**
   * Executa atualização de localização
   *
   * @param input - Dados da atualização (name, capacity, isActive)
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados atualizados ou erro
   */
  execute(
    input: UpdateLocationInput,
    context: ExecutionContext
  ): Promise<Result<UpdateLocationOutput, string>>;
}
