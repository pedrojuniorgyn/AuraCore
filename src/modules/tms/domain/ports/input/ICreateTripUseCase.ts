/**
 * ICreateTripUseCase - Port de Input para criar viagem
 */
import { Result } from '@/shared/domain';
import type { DriverTypeValue } from '../../value-objects/DriverType';

export interface CreateTripInput {
  vehicleId: number;
  driverId: number;
  driverType?: DriverTypeValue;
  trailer1Id?: number;
  trailer2Id?: number;
  pickupOrderIds?: number[];
  scheduledStart?: Date;
  scheduledEnd?: Date;
  estimatedRevenue?: number;
  estimatedCost?: number;
  notes?: string;
}

export interface CreateTripOutput {
  id: number;
  tripNumber: string;
  status: string;
}

export interface ICreateTripUseCase {
  execute(
    input: CreateTripInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreateTripOutput, string>>;
}
