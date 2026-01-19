/**
 * IListTripsUseCase - Port de Input para listar viagens
 */
import { Result } from '@/shared/domain';
import type { TripStatusType } from '../../value-objects/TripStatus';
import type { TripOutput } from './IGetTripByIdUseCase';

export interface ListTripsInput {
  status?: TripStatusType;
  driverId?: number;
  vehicleId?: number;
  startDateFrom?: Date;
  startDateTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface ListTripsOutput {
  items: TripOutput[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IListTripsUseCase {
  execute(
    input: ListTripsInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<ListTripsOutput, string>>;
}
