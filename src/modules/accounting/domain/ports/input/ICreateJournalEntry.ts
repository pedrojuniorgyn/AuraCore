/**
 * Input Port: Criar Lançamento Contábil
 *
 * Cria um novo lançamento contábil em status DRAFT.
 * Linhas podem ser adicionadas na criação ou depois via IAddLineToEntry.
 *
 * Regras de Negócio:
 * - Lançamento inicia em status DRAFT
 * - Data do lançamento define o período (ano/mês)
 * - Source indica origem (MANUAL, PAYMENT, RECEIPT, FISCAL_DOC, etc)
 * - Multi-tenancy: organizationId + branchId obrigatórios
 *
 * @see ARCH-001: Domain não importa de Application
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type {
  ExecutionContext,
  CreateJournalEntryInput,
  CreateJournalEntryOutput,
} from '../../types/journal-entry.types';

/**
 * Interface Input Port: Criar Lançamento Contábil
 */
export interface ICreateJournalEntry {
  /**
   * Executa criação de lançamento contábil
   *
   * @param input - Dados do lançamento (data, descrição, linhas, etc)
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados do lançamento criado ou mensagem de erro
   */
  execute(
    input: CreateJournalEntryInput,
    ctx: ExecutionContext
  ): Promise<Result<CreateJournalEntryOutput, string>>;
}
