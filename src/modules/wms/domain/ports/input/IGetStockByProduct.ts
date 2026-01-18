/**
 * Input Port: Buscar Estoque por Produto
 *
 * Retorna estoque consolidado de um produto em todas as localizações.
 *
 * Regras de Negócio:
 * - Produto deve ter estoque em pelo menos uma localização
 * - Retorna totalizadores e detalhamento por localização
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';

/**
 * Input para buscar estoque por produto
 */
export interface GetStockByProductInput {
  /** UUID do produto */
  productId: string;
}

/**
 * Item de estoque por localização
 */
export interface StockByLocationItem {
  locationId: string;
  locationCode: string;
  locationName: string;
  quantity: number;
  unit: string;
  reservedQuantity: number;
  availableQuantity: number;
  lotNumber: string | null;
  expirationDate: Date | null;
  isExpired: boolean;
  unitCost: number;
  currency: string;
}

/**
 * Output consolidado de estoque por produto
 */
export interface GetStockByProductOutput {
  productId: string;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  locations: StockByLocationItem[];
}

/**
 * Interface Input Port: Buscar Estoque por Produto
 */
export interface IGetStockByProduct {
  execute(
    input: GetStockByProductInput,
    context: ExecutionContext
  ): Promise<Result<GetStockByProductOutput, string>>;
}
