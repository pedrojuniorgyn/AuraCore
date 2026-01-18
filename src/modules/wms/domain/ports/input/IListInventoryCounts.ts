/**
 * Input Port: Listar Contagens de Inventário
 *
 * Retorna lista paginada de contagens de inventário.
 *
 * Regras de Negócio:
 * - Paginação obrigatória
 * - Filtros por status, localização, produto
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';
import type { PaginatedResponse } from '../../../application/dtos/ListQueryDTO';

/**
 * Input para listar contagens
 */
export interface ListInventoryCountsInput {
  page: number;
  limit: number;
  status?: string;
  locationId?: string;
  productId?: string;
}

/**
 * Item da lista de contagens
 */
export interface InventoryCountListItem {
  id: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  systemUnit: string;
  countedQuantity: number | null;
  difference: number | null;
  status: string;
  countedBy: string | null;
  countedAt: Date | null;
  createdAt: Date;
}

/**
 * Interface Input Port: Listar Contagens de Inventário
 */
export interface IListInventoryCounts {
  execute(
    input: ListInventoryCountsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<InventoryCountListItem>, string>>;
}
