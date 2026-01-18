/**
 * Input Port: Excluir Localização
 *
 * Remove uma localização do armazém (soft delete).
 *
 * Regras de Negócio:
 * - Localização deve existir
 * - Não pode ter estoque ativo
 * - Não pode ter filhos ativos
 * - Multi-tenancy: validação de branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';

/**
 * Input para excluir localização
 */
export interface DeleteLocationInput {
  /** UUID da localização */
  id: string;
}

/**
 * Output após exclusão
 */
export interface DeleteLocationOutput {
  /** UUID da localização excluída */
  id: string;
  /** Indica se foi excluída com sucesso */
  deleted: boolean;
  /** Data/hora da exclusão */
  deletedAt: string;
}

/**
 * Interface Input Port: Excluir Localização
 */
export interface IDeleteLocation {
  /**
   * Executa exclusão de localização
   *
   * @param input - ID da localização
   * @param context - Contexto de execução (userId, orgId, branchId)
   * @returns Result com confirmação ou erro
   */
  execute(
    input: DeleteLocationInput,
    context: ExecutionContext
  ): Promise<Result<DeleteLocationOutput, string>>;
}
