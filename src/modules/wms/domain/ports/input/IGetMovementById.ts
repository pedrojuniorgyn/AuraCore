/**
 * Input Port: Buscar Movimentação por ID
 *
 * Retorna detalhes de uma movimentação de estoque.
 *
 * Regras de Negócio:
 * - Movimentação deve existir
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../../application/dtos/ExecutionContext';

/**
 * Input para buscar movimentação por ID
 */
export interface GetMovementByIdInput {
  /** UUID da movimentação */
  id: string;
}

/**
 * Output com detalhes da movimentação
 */
export interface GetMovementByIdOutput {
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
 * Interface Input Port: Buscar Movimentação por ID
 */
export interface IGetMovementById {
  execute(
    input: GetMovementByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetMovementByIdOutput, string>>;
}
