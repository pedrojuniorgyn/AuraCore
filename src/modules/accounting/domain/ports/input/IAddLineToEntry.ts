/**
 * Input Port: Adicionar Linha ao Lançamento
 *
 * Adiciona uma nova linha (débito ou crédito) a um lançamento existente.
 *
 * Regras de Negócio:
 * - Lançamento deve estar em status DRAFT
 * - Conta contábil deve existir e estar ativa
 * - Valor deve ser positivo
 * - EntryType define se é DEBIT ou CREDIT
 * - Multi-tenancy: validação de branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/use-cases/BaseUseCase';
import type {
  AddLineInput,
  AddLineOutput,
} from '../../../application/dtos/AddLineDTO';

/**
 * Interface Input Port: Adicionar Linha ao Lançamento
 */
export interface IAddLineToEntry {
  /**
   * Executa adição de linha ao lançamento
   *
   * @param input - Dados da linha (conta, tipo, valor, etc)
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados da linha criada e totais atualizados
   */
  execute(
    input: AddLineInput,
    ctx: ExecutionContext
  ): Promise<Result<AddLineOutput, string>>;
}
