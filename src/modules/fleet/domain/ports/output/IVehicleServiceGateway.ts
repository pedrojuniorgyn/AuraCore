/**
 * Gateway para operações de veículos com centro de custo
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface CreateVehicleParams {
  organizationId: number;
  branchId: number;
  plate: string;
  model: string;
  brand: string;
  year: number;
  vehicleType: string;
  capacity: number;
  createCostCenter: boolean;
  createdBy: string;
}

export interface VehicleCreatedResult {
  vehicleId: number;
  costCenterId?: number;
}

export interface IVehicleServiceGateway {
  createWithCostCenter(params: CreateVehicleParams): Promise<Result<VehicleCreatedResult, string>>;
}
