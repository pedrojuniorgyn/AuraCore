/**
 * Input Port: Buscar Contagem de Inventário por ID
 *
 * Retorna detalhes de uma contagem de inventário.
 *
 * Regras de Negócio:
 * - Contagem deve existir
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';

/**
 * Input para buscar contagem por ID
 */
export interface GetInventoryCountByIdInput {
  /** UUID da contagem */
  id: string;
}

/**
 * Output com detalhes da contagem
 */
export interface GetInventoryCountByIdOutput {
  id: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  systemUnit: string;
  countedQuantity: number | null;
  countedUnit: string | null;
  difference: number | null;
  status: string;
  adjustmentMovementId: string | null;
  countedBy: string | null;
  countedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface Input Port: Buscar Contagem de Inventário por ID
 */
export interface IGetInventoryCountById {
  execute(
    input: GetInventoryCountByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetInventoryCountByIdOutput, string>>;
}
