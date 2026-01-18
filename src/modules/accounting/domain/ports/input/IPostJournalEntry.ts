/**
 * Input Port: Postar Lançamento Contábil
 *
 * Valida partidas dobradas e altera status para POSTED.
 * Após postagem, lançamento não pode mais ser editado.
 *
 * Regras de Negócio:
 * - Lançamento deve estar em status DRAFT
 * - Deve ter pelo menos uma linha de débito e uma de crédito
 * - Total de débitos deve ser igual ao total de créditos (partidas dobradas)
 * - Registra data/hora e usuário da postagem
 * - Multi-tenancy: validação de branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/use-cases/BaseUseCase';

/**
 * Input para postar lançamento contábil
 */
export interface PostJournalEntryInput {
  /** UUID do lançamento a ser postado */
  journalEntryId: string;
}

/**
 * Output após postagem do lançamento
 */
export interface PostJournalEntryOutput {
  /** UUID do lançamento */
  id: string;
  /** Número do lançamento */
  entryNumber: string;
  /** Novo status (POSTED) */
  status: string;
  /** Total de débitos */
  totalDebit: number;
  /** Total de créditos */
  totalCredit: number;
  /** Data/hora da postagem (ISO string) */
  postedAt: string;
  /** ID do usuário que postou */
  postedBy: string;
}

/**
 * Interface Input Port: Postar Lançamento Contábil
 */
export interface IPostJournalEntry {
  /**
   * Executa postagem do lançamento
   *
   * @param input - ID do lançamento a ser postado
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da postagem ou mensagem de erro
   */
  execute(
    input: PostJournalEntryInput,
    ctx: ExecutionContext
  ): Promise<Result<PostJournalEntryOutput, string>>;
}
