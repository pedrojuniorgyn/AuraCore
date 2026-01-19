/**
 * DriverMapper - Mapper entre Driver entity e row do banco
 */
import { Result } from '@/shared/domain';
import { Driver } from '../../../domain/entities/Driver';
import { DriverStatus } from '../../../domain/value-objects/DriverStatus';
import type { DriverRow, DriverInsert } from '../schemas/driver.schema';

export class DriverMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: DriverRow): Result<Driver, string> {
    // Parse DriverStatus
    const statusResult = DriverStatus.create(row.status || 'ACTIVE');
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    return Driver.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      name: row.name,
      cpf: row.cpf,
      phone: row.phone,
      email: row.email,
      cnhNumber: row.cnhNumber,
      cnhCategory: row.cnhCategory,
      cnhExpiry: row.cnhExpiry,
      cnhIssueDate: row.cnhIssueDate,
      partnerId: row.partnerId,
      status: statusResult.value,
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
  static toPersistence(entity: Driver): DriverInsert {
    return {
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      name: entity.name,
      cpf: entity.cpf,
      phone: entity.phone,
      email: entity.email,
      cnhNumber: entity.cnhNumber,
      cnhCategory: entity.cnhCategory,
      cnhExpiry: entity.cnhExpiry,
      cnhIssueDate: entity.cnhIssueDate,
      partnerId: entity.partnerId,
      status: entity.status.value,
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
