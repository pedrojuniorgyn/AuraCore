/**
 * IGetTripByIdUseCase - Port de Input para buscar viagem por ID
 */
import { Result } from '@/shared/domain';

export interface GetTripByIdInput {
  tripId: number;
}

export interface TripOutput {
  id: number;
  tripNumber: string;
  vehicleId: number;
  driverId: number;
  driverType: string;
  status: string;
  scheduledStart: Date | null;
  actualStart: Date | null;
  scheduledEnd: Date | null;
  actualEnd: Date | null;
  requiresCiot: boolean;
  ciotNumber: string | null;
  mdfeId: number | null;
  mdfeStatus: string | null;
  estimatedRevenue: number | null;
  actualRevenue: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetTripByIdUseCase {
  execute(
    input: GetTripByIdInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<TripOutput | null, string>>;
}
