/**
 * Input Port: Estornar Títulos Financeiros
 * 
 * Estorna títulos financeiros (pagos ou recebidos), revertendo lançamentos contábeis.
 * 
 * Regras de Negócio:
 * - Apenas títulos com status PAID podem ser estornados
 * - Estorno cria lançamentos contábeis de reversão
 * - Requer permissão 'financial.titles.reverse'
 * - Multi-tenancy: organizationId + branchId obrigatórios
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from './IPayAccountPayable';

export interface ReverseTitlesInput {
  /** IDs dos títulos a estornar */
  titleIds: string[];
  
  /** Motivo do estorno (obrigatório para auditoria) */
  reason: string;
  
  /** Data do estorno (default: hoje) */
  reversalDate?: string;
}

export interface ReverseTitlesOutput {
  /** IDs dos títulos estornados */
  reversedTitleIds: string[];
  
  /** Número de títulos estornados */
  count: number;
  
  /** IDs dos lançamentos contábeis de estorno */
  journalEntryIds: string[];
}

/**
 * Interface Input Port: Estornar Títulos
 */
export interface IReverseTitles {
  /**
   * Executa estorno de títulos financeiros
   * 
   * @param input - IDs dos títulos e motivo
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com dados do estorno ou mensagem de erro
   */
  execute(
    input: ReverseTitlesInput,
    ctx: ExecutionContext
  ): Promise<Result<ReverseTitlesOutput, string>>;
}
