/**
 * Input Port: Buscar Lançamento Contábil por ID
 *
 * Retorna um lançamento específico com todas as suas linhas.
 *
 * Regras de Negócio:
 * - Valida existência do lançamento
 * - Admin pode ver qualquer branch; usuário comum apenas seu branch
 * - Retorna todas as linhas do lançamento
 * - Multi-tenancy: organizationId sempre validado
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/use-cases/BaseUseCase';
import type { JournalEntryResponseDTO } from '../../../application/dtos/JournalEntryResponseDTO';

/**
 * Input para buscar lançamento por ID
 */
export interface GetJournalEntryByIdInput {
  /** UUID do lançamento */
  id: string;
}

/**
 * Interface Input Port: Buscar Lançamento Contábil por ID
 */
export interface IGetJournalEntryById {
  /**
   * Executa busca de lançamento por ID
   *
   * @param input - ID do lançamento
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados completos do lançamento ou mensagem de erro
   */
  execute(
    input: GetJournalEntryByIdInput,
    ctx: ExecutionContext
  ): Promise<Result<JournalEntryResponseDTO, string>>;
}
