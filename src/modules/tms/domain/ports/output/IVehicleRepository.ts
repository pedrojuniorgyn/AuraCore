/**
 * IVehicleRepository - Port de Output para persistência de Vehicles
 */
import { Result } from '@/shared/domain';
import type { Vehicle } from '../../entities/Vehicle';
import type { VehicleStatusType } from '../../value-objects/VehicleStatus';

export interface VehicleFilter {
  organizationId: number;
  branchId?: number;
  status?: VehicleStatusType;
  type?: string;
  plate?: string;
  page?: number;
  pageSize?: number;
}

export interface VehicleListResult {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IVehicleRepository {
  findById(id: number, organizationId: number): Promise<Result<Vehicle | null, string>>;
  findByPlate(plate: string, organizationId: number): Promise<Result<Vehicle | null, string>>;
  findMany(filter: VehicleFilter): Promise<Result<VehicleListResult, string>>;
  findAvailable(organizationId: number, branchId: number): Promise<Result<Vehicle[], string>>;
  save(vehicle: Vehicle): Promise<Result<number, string>>;
  delete(id: number, organizationId: number): Promise<Result<void, string>>;
}
