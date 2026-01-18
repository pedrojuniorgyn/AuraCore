/**
 * Input Port: Reverter Lançamento Contábil (Estorno)
 *
 * Cria um lançamento de estorno para anular um lançamento postado.
 *
 * Regras de Negócio:
 * - Lançamento original deve estar em status POSTED
 * - Cria novo lançamento com valores invertidos (débito→crédito, crédito→débito)
 * - Lançamento original fica com status REVERSED
 * - Novo lançamento referencia o original via reversesId
 * - Original referencia o estorno via reversedById
 * - Multi-tenancy: validação de branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/use-cases/BaseUseCase';

/**
 * Input para reverter lançamento contábil
 */
export interface ReverseJournalEntryInput {
  /** UUID do lançamento a ser revertido */
  journalEntryId: string;
  /** Motivo do estorno */
  reason: string;
  /** Data do estorno (default: data atual) - ISO string */
  reversalDate?: string;
}

/**
 * Output após reversão do lançamento
 */
export interface ReverseJournalEntryOutput {
  /** UUID do lançamento original */
  originalEntryId: string;
  /** UUID do lançamento de estorno criado */
  reversalEntryId: string;
  /** Número do lançamento de estorno */
  reversalEntryNumber: string;
  /** Status do lançamento original (REVERSED) */
  status: string;
  /** Data/hora da reversão (ISO string) */
  reversedAt: string;
}

/**
 * Interface Input Port: Reverter Lançamento Contábil
 */
export interface IReverseJournalEntry {
  /**
   * Executa reversão do lançamento
   *
   * @param input - ID do lançamento e motivo do estorno
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados do estorno ou mensagem de erro
   */
  execute(
    input: ReverseJournalEntryInput,
    ctx: ExecutionContext
  ): Promise<Result<ReverseJournalEntryOutput, string>>;
}
