/**
 * Input Port: Listar Localizações
 *
 * Retorna lista paginada de localizações com filtros.
 *
 * Regras de Negócio:
 * - Paginação obrigatória
 * - Filtros opcionais por tipo, warehouse, status
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';
import type { PaginatedResponse } from '../../../application/dtos/ListQueryDTO';

/**
 * Input para listar localizações
 */
export interface ListLocationsInput {
  page: number;
  limit: number;
  type?: string;
  warehouseId?: string;
  isActive?: boolean;
}

/**
 * Item da lista de localizações
 */
export interface LocationListItem {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  capacity: number | null;
  capacityUnit: string | null;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Interface Input Port: Listar Localizações
 */
export interface IListLocations {
  execute(
    input: ListLocationsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<LocationListItem>, string>>;
}
