/**
 * Input Port: Buscar Localização por ID
 *
 * Retorna detalhes de uma localização específica.
 *
 * Regras de Negócio:
 * - Localização deve existir
 * - Multi-tenancy: organizationId + branchId
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import type { Result } from '@/shared/domain';
import type { ExecutionContext } from '../../types/wms.types';

/**
 * Input para buscar localização por ID
 */
export interface GetLocationByIdInput {
  /** UUID da localização */
  id: string;
}

/**
 * Output com detalhes da localização
 */
export interface GetLocationByIdOutput {
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
  updatedAt: Date;
}

/**
 * Interface Input Port: Buscar Localização por ID
 */
export interface IGetLocationById {
  execute(
    input: GetLocationByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetLocationByIdOutput, string>>;
}
