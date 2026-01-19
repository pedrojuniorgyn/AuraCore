/**
 * TripMapper - Mapper entre Trip entity e row do banco
 */
import { Result, Money } from '@/shared/domain';
import { Trip } from '../../../domain/entities/Trip';
import { TripStatus } from '../../../domain/value-objects/TripStatus';
import { DriverType } from '../../../domain/value-objects/DriverType';
import type { TripRow, TripInsert } from '../schemas/trip.schema';

export class TripMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: TripRow): Result<Trip, string> {
    // Parse TripStatus
    const statusResult = TripStatus.create(row.status || 'DRAFT');
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    // Parse DriverType
    const driverTypeResult = DriverType.create(row.driverType || 'OWN');
    if (Result.isFail(driverTypeResult)) {
      return Result.fail(driverTypeResult.error);
    }

    // Parse pickupOrderIds from JSON
    let pickupOrderIds: number[] = [];
    if (row.pickupOrderIds) {
      try {
        pickupOrderIds = JSON.parse(row.pickupOrderIds);
      } catch {
        pickupOrderIds = [];
      }
    }

    // Parse Money values
    let estimatedRevenue: Money | null = null;
    let actualRevenue: Money | null = null;
    let estimatedCost: Money | null = null;
    let actualCost: Money | null = null;
    let ciotValue: Money | null = null;

    if (row.estimatedRevenue) {
      const result = Money.create(Number(row.estimatedRevenue), 'BRL');
      if (Result.isOk(result)) estimatedRevenue = result.value;
    }
    if (row.actualRevenue) {
      const result = Money.create(Number(row.actualRevenue), 'BRL');
      if (Result.isOk(result)) actualRevenue = result.value;
    }
    if (row.estimatedCost) {
      const result = Money.create(Number(row.estimatedCost), 'BRL');
      if (Result.isOk(result)) estimatedCost = result.value;
    }
    if (row.actualCost) {
      const result = Money.create(Number(row.actualCost), 'BRL');
      if (Result.isOk(result)) actualCost = result.value;
    }
    if (row.ciotValue) {
      const result = Money.create(Number(row.ciotValue), 'BRL');
      if (Result.isOk(result)) ciotValue = result.value;
    }

    return Trip.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      tripNumber: row.tripNumber,
      vehicleId: row.vehicleId,
      driverId: row.driverId,
      driverType: driverTypeResult.value,
      trailer1Id: row.trailer1Id,
      trailer2Id: row.trailer2Id,
      pickupOrderIds,
      scheduledStart: row.scheduledStart,
      actualStart: row.actualStart,
      scheduledEnd: row.scheduledEnd,
      actualEnd: row.actualEnd,
      mdfeId: row.mdfeId,
      mdfeStatus: row.mdfeStatus,
      requiresCiot: row.requiresCiot === 'true',
      ciotNumber: row.ciotNumber,
      ciotValue,
      ciotIssuedAt: row.ciotIssuedAt,
      status: statusResult.value,
      estimatedRevenue,
      actualRevenue,
      estimatedCost,
      actualCost,
      notes: row.notes,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      deletedAt: row.deletedAt,
      version: row.version ?? 1,
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: Trip): TripInsert {
    return {
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      tripNumber: entity.tripNumber,
      vehicleId: entity.vehicleId,
      driverId: entity.driverId,
      driverType: entity.driverType.value,
      trailer1Id: entity.trailer1Id,
      trailer2Id: entity.trailer2Id,
      pickupOrderIds: JSON.stringify(entity.pickupOrderIds),
      scheduledStart: entity.scheduledStart,
      actualStart: entity.actualStart,
      scheduledEnd: entity.scheduledEnd,
      actualEnd: entity.actualEnd,
      mdfeId: entity.mdfeId,
      mdfeStatus: entity.mdfeStatus,
      requiresCiot: entity.requiresCiot ? 'true' : 'false',
      ciotNumber: entity.ciotNumber,
      ciotValue: entity.ciotValue?.amount.toString(),
      ciotIssuedAt: entity.ciotIssuedAt,
      status: entity.status.value,
      estimatedRevenue: entity.estimatedRevenue?.amount.toString(),
      actualRevenue: entity.actualRevenue?.amount.toString(),
      estimatedCost: entity.estimatedCost?.amount.toString(),
      actualCost: entity.actualCost?.amount.toString(),
      notes: entity.notes,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      version: entity.version,
    };
  }
}
