/**
 * Input Port: Listar Lançamentos Contábeis
 *
 * Retorna lista paginada de lançamentos com filtros opcionais.
 *
 * Regras de Negócio:
 * - Paginação obrigatória (default: page=1, pageSize=20)
 * - Admin pode ver todos os branches; usuário comum apenas seu branch
 * - Filtros por status, source, período, data, busca textual
 * - Ordenação configurável
 * - Multi-tenancy: organizationId sempre filtrado
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/use-cases/BaseUseCase';
import type { PaginatedJournalEntriesDTO } from '../../../application/dtos/JournalEntryResponseDTO';

/**
 * Input para listagem de lançamentos
 */
export interface ListJournalEntriesInput {
  /** Filtro por status (array) */
  status?: string[];
  /** Filtro por origem (array) */
  source?: string[];
  /** Ano do período */
  periodYear?: number;
  /** Mês do período (1-12) */
  periodMonth?: number;
  /** Data inicial (ISO string) */
  entryDateFrom?: string;
  /** Data final (ISO string) */
  entryDateTo?: string;
  /** Busca textual (descrição, número) */
  search?: string;
  /** Página (default: 1) */
  page?: number;
  /** Itens por página (default: 20, max: 100) */
  pageSize?: number;
  /** Campo para ordenação */
  sortBy?: string;
  /** Direção da ordenação (default: desc) */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface Input Port: Listar Lançamentos Contábeis
 */
export interface IListJournalEntries {
  /**
   * Executa listagem de lançamentos
   *
   * @param input - Filtros e opções de paginação
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com lista paginada de lançamentos
   */
  execute(
    input: ListJournalEntriesInput,
    ctx: ExecutionContext
  ): Promise<Result<PaginatedJournalEntriesDTO, string>>;
}
