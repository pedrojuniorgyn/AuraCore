/**
 * VehicleMapper - Mapper entre Vehicle entity e row do banco
 */
import { Result } from '@/shared/domain';
import { Vehicle } from '../../../domain/entities/Vehicle';
import { VehicleStatus } from '../../../domain/value-objects/VehicleStatus';
import type { VehicleRow, VehicleInsert } from '../schemas/vehicle.schema';

export class VehicleMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: VehicleRow): Result<Vehicle, string> {
    // Parse VehicleStatus
    const statusResult = VehicleStatus.create(row.status || 'AVAILABLE');
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    return Vehicle.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      plate: row.plate,
      renavam: row.renavam,
      chassis: row.chassis,
      type: row.type,
      brand: row.brand,
      model: row.model,
      year: row.year,
      color: row.color,
      capacityKg: Number(row.capacityKg) || 0,
      capacityM3: Number(row.capacityM3) || 0,
      taraKg: Number(row.taraKg) || 0,
      status: statusResult.value,
      currentKm: row.currentKm ?? 0,
      maintenanceStatus: row.maintenanceStatus || 'OK',
      lastMaintenanceDate: row.lastMaintenanceDate,
      nextMaintenanceKm: row.nextMaintenanceKm,
      licensePlateExpiry: row.licensePlateExpiry,
      insuranceExpiry: row.insuranceExpiry,
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
  static toPersistence(entity: Vehicle): VehicleInsert {
    return {
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      plate: entity.plate,
      renavam: entity.renavam,
      chassis: entity.chassis,
      type: entity.type,
      brand: entity.brand,
      model: entity.model,
      year: entity.year,
      color: entity.color,
      capacityKg: entity.capacityKg.toString(),
      capacityM3: entity.capacityM3.toString(),
      taraKg: entity.taraKg.toString(),
      status: entity.status.value,
      currentKm: entity.currentKm,
      maintenanceStatus: entity.maintenanceStatus,
      lastMaintenanceDate: entity.lastMaintenanceDate,
      nextMaintenanceKm: entity.nextMaintenanceKm,
      licensePlateExpiry: entity.licensePlateExpiry,
      insuranceExpiry: entity.insuranceExpiry,
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
