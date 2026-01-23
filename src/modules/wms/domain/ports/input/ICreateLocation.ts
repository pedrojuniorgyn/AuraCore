/**
 * Input Port: Criar Localização no Armazém
 *
 * Cria uma nova localização hierárquica no armazém.
 *
 * Regras de Negócio:
 * - Código deve ser único no warehouse
 * - WAREHOUSE não pode ter parent
 * - AISLE/SHELF/POSITION devem ter parent
 * - Parent deve estar no mesmo warehouse
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/wms.types';
import type {
  CreateLocationInput,
  CreateLocationOutput,
} from '../../types/wms.types';

/**
 * Interface Input Port: Criar Localização
 */
export interface ICreateLocation {
  /**
   * Executa criação de localização
   *
   * @param input - Dados da localização (warehouse, code, name, type, etc)
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da localização criada ou erro
   */
  execute(
    input: CreateLocationInput,
    context: ExecutionContext
  ): Promise<Result<CreateLocationOutput, string>>;
}
