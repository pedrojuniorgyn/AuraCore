/**
 * GetTripByIdQuery - Query para buscar viagem por ID
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IGetTripByIdUseCase, GetTripByIdInput, TripOutput } from '../../domain/ports/input/IGetTripByIdUseCase';
import type { ITripRepository } from '../../domain/ports/output/ITripRepository';
import type { Trip } from '../../domain/entities/Trip';

@injectable()
export class GetTripByIdQuery implements IGetTripByIdUseCase {
  constructor(
    @inject('ITripRepository') private tripRepository: ITripRepository
  ) {}

  async execute(
    input: GetTripByIdInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<TripOutput | null, string>> {
    const tripResult = await this.tripRepository.findById(
      input.tripId,
      context.organizationId,
      context.branchId
    );

    if (Result.isFail(tripResult)) {
      return Result.fail(tripResult.error);
    }

    if (!tripResult.value) {
      return Result.ok(null);
    }

    return Result.ok(this.mapToOutput(tripResult.value));
  }

  private mapToOutput(trip: Trip): TripOutput {
    return {
      id: trip.id,
      tripNumber: trip.tripNumber,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      driverType: trip.driverType.value,
      status: trip.status.value,
      scheduledStart: trip.scheduledStart,
      actualStart: trip.actualStart,
      scheduledEnd: trip.scheduledEnd,
      actualEnd: trip.actualEnd,
      requiresCiot: trip.requiresCiot,
      ciotNumber: trip.ciotNumber,
      mdfeId: trip.mdfeId,
      mdfeStatus: trip.mdfeStatus,
      estimatedRevenue: trip.estimatedRevenue?.amount ?? null,
      actualRevenue: trip.actualRevenue?.amount ?? null,
      estimatedCost: trip.estimatedCost?.amount ?? null,
      actualCost: trip.actualCost?.amount ?? null,
      notes: trip.notes,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
  }
}
