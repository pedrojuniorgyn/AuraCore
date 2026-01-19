/**
 * ListTripsQuery - Query para listar viagens
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IListTripsUseCase, ListTripsInput, ListTripsOutput } from '../../domain/ports/input/IListTripsUseCase';
import type { TripOutput } from '../../domain/ports/input/IGetTripByIdUseCase';
import type { ITripRepository } from '../../domain/ports/output/ITripRepository';
import type { Trip } from '../../domain/entities/Trip';

@injectable()
export class ListTripsQuery implements IListTripsUseCase {
  constructor(
    @inject('ITripRepository') private tripRepository: ITripRepository
  ) {}

  async execute(
    input: ListTripsInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<ListTripsOutput, string>> {
    const result = await this.tripRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      status: input.status,
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      startDateFrom: input.startDateFrom,
      startDateTo: input.startDateTo,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });

    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    return Result.ok({
      items: result.value.items.map(trip => this.mapToOutput(trip)),
      total: result.value.total,
      page: result.value.page,
      pageSize: result.value.pageSize,
    });
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
