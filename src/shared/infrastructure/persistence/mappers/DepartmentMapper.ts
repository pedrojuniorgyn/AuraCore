/**
 * Mapper: DepartmentMapper
 * Converte entre Domain e Persistence para Department
 *
 * @module shared/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { Department } from '@/shared/domain/entities/Department';
import type { DepartmentRow, DepartmentInsert } from '../schemas/department.schema';

export class DepartmentMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: DepartmentRow): Result<Department, string> {
    return Department.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      parentId: row.parentId ?? null,
      managerUserId: row.managerUserId ?? null,
      isActive: Boolean(row.isActive),
      createdBy: row.createdBy ?? null,
      updatedBy: row.updatedBy ?? null,
      createdAt: new Date(row.createdAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(domain: Department): DepartmentInsert {
    return {
      id: domain.id,
      organizationId: domain.organizationId,
      branchId: domain.branchId,
      code: domain.code,
      name: domain.name,
      description: domain.description,
      parentId: domain.parentId,
      managerUserId: domain.managerUserId,
      isActive: domain.isActive,
      createdBy: domain.createdBy,
      updatedBy: domain.updatedBy,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      deletedAt: null,
    };
  }
}
