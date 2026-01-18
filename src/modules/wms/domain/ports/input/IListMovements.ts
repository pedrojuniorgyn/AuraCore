/**
 * Input Port: Listar Movimentações de Estoque
 *
 * Retorna lista paginada de movimentações com filtros.
 *
 * Regras de Negócio:
 * - Paginação obrigatória
 * - Filtros por produto, localização, tipo, período
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';
import type { PaginatedResponse } from '../../../application/dtos/ListQueryDTO';

/**
 * Input para listar movimentações
 */
export interface ListMovementsInput {
  page: number;
  limit: number;
  productId?: string;
  locationId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Item da lista de movimentações
 */
export interface MovementListItem {
  id: string;
  productId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  type: string;
  quantity: number;
  unit: string;
  unitCost: number;
  currency: string;
  totalCost: number;
  reason: string | null;
  executedBy: string;
  executedAt: Date;
  createdAt: Date;
}

/**
 * Interface Input Port: Listar Movimentações
 */
export interface IListMovements {
  execute(
    input: ListMovementsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<MovementListItem>, string>>;
}
