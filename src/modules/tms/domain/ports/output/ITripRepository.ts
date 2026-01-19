/**
 * ITripRepository - Port de Output para persistência de Trips
 */
import { Result } from '@/shared/domain';
import type { Trip } from '../../entities/Trip';
import type { TripStatusType } from '../../value-objects/TripStatus';

export interface TripFilter {
  organizationId: number;
  branchId: number;
  status?: TripStatusType;
  driverId?: number;
  vehicleId?: number;
  startDateFrom?: Date;
  startDateTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface TripListResult {
  items: Trip[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ITripRepository {
  findById(id: number, organizationId: number, branchId: number): Promise<Result<Trip | null, string>>;
  findByTripNumber(tripNumber: string, organizationId: number): Promise<Result<Trip | null, string>>;
  findMany(filter: TripFilter): Promise<Result<TripListResult, string>>;
  findByDriver(driverId: number, organizationId: number, branchId: number): Promise<Result<Trip[], string>>;
  findByVehicle(vehicleId: number, organizationId: number, branchId: number): Promise<Result<Trip[], string>>;
  save(trip: Trip): Promise<Result<number, string>>; // Retorna ID criado/atualizado
  delete(id: number, organizationId: number, branchId: number): Promise<Result<void, string>>;
  countByStatus(organizationId: number, branchId: number, status: TripStatusType): Promise<Result<number, string>>;
}
