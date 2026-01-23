/**
 * Input Port: Listar Contas a Pagar
 * 
 * Consulta lista paginada de contas a pagar com filtros.
 * 
 * Regras de Negócio:
 * - Requer permissão 'financial.payables.read'
 * - Multi-tenancy: filtra automaticamente por organizationId+branchId
 * - Paginação obrigatória (evitar sobrecarga)
 * - Suporta filtros por status, fornecedor, período
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext, PaginatedPayables } from '../../types/payable.types';

export interface ListPayablesInput {
  /** Número da página (1-based) */
  page?: number;
  
  /** Tamanho da página (default: 20) */
  pageSize?: number;
  
  /** Filtro por status */
  status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  
  /** Filtro por fornecedor */
  supplierId?: number;
  
  /** Filtro por período de vencimento (início) */
  dueDateFrom?: string;
  
  /** Filtro por período de vencimento (fim) */
  dueDateTo?: string;
  
  /** Busca textual (documento, descrição) */
  search?: string;
  
  /** Campo para ordenação */
  sortBy?: 'dueDate' | 'amount' | 'createdAt' | 'documentNumber';
  
  /** Direção da ordenação */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface Input Port: Listar Contas a Pagar
 */
export interface IListPayables {
  /**
   * Executa listagem de contas a pagar
   * 
   * @param input - Filtros e paginação
   * @param ctx - Contexto de execução (userId, orgId, branchId)
   * @returns Result com lista paginada ou mensagem de erro
   */
  execute(
    input: ListPayablesInput,
    ctx: ExecutionContext
  ): Promise<Result<PaginatedPayables, string>>;
}
