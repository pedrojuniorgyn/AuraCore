/**
 * Input Port: Buscar Item de Estoque por ID
 *
 * Retorna detalhes de um item de estoque específico.
 *
 * Regras de Negócio:
 * - Item deve existir
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/wms.types';

/**
 * Input para buscar item de estoque por ID
 */
export interface GetStockItemByIdInput {
  /** UUID do item de estoque */
  id: string;
}

/**
 * Output com detalhes do item de estoque
 */
export interface GetStockItemByIdOutput {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  unit: string;
  reservedQuantity: number;
  availableQuantity: number;
  lotNumber: string | null;
  expirationDate: Date | null;
  isExpired: boolean;
  unitCost: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface Input Port: Buscar Item de Estoque por ID
 */
export interface IGetStockItemById {
  execute(
    input: GetStockItemByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetStockItemByIdOutput, string>>;
}
