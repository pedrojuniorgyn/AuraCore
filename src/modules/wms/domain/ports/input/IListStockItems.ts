/**
 * Input Port: Listar Itens de Estoque
 *
 * Retorna lista paginada de itens de estoque com filtros.
 *
 * Regras de Negócio:
 * - Paginação obrigatória
 * - Filtros por produto, localização, warehouse, quantidade, lote, expiração
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';
import type { PaginatedResponse } from '../../../application/dtos/ListQueryDTO';

/**
 * Input para listar itens de estoque
 */
export interface ListStockItemsInput {
  page: number;
  limit: number;
  productId?: string;
  locationId?: string;
  warehouseId?: string;
  minQuantity?: number;
  hasStock?: boolean;
  lotNumber?: string;
  expired?: boolean;
}

/**
 * Item da lista de estoque
 */
export interface StockItemListItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  unit: string;
  availableQuantity: number;
  lotNumber: string | null;
  expirationDate: Date | null;
  isExpired: boolean;
  unitCost: number;
  currency: string;
  createdAt: Date;
}

/**
 * Interface Input Port: Listar Itens de Estoque
 */
export interface IListStockItems {
  execute(
    input: ListStockItemsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<StockItemListItem>, string>>;
}
