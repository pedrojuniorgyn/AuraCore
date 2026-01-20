/**
 * Adapter para vehicle-service legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  IVehicleServiceGateway, 
  CreateVehicleParams,
  VehicleCreatedResult,
} from '../../domain/ports/output/IVehicleServiceGateway';

// Import legado
import { createVehicleWithCostCenter } from '@/services/fleet/vehicle-service';

@injectable()
export class VehicleServiceAdapter implements IVehicleServiceGateway {
  async createWithCostCenter(params: CreateVehicleParams): Promise<Result<VehicleCreatedResult, string>> {
    try {
      const result = await createVehicleWithCostCenter({
        organizationId: params.organizationId,
        branchId: params.branchId,
        plate: params.plate,
        model: params.model,
        brand: params.brand,
        year: params.year,
        type: params.vehicleType,
        capacityKg: params.capacity,
      }, params.createdBy);
      
      if (!result.success) {
        return Result.fail(result.error || 'Erro ao criar veículo');
      }
      return Result.ok({
        vehicleId: result.vehicleId || 0,
        costCenterId: result.costCenterId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao criar veículo: ${message}`);
    }
  }
}
