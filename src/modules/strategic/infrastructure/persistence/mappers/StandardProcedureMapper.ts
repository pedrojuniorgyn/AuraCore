/**
 * Mapper: StandardProcedureMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { StandardProcedure, type StandardProcedureStatus } from '../../../domain/entities/StandardProcedure';
import type { StandardProcedureRow, StandardProcedureInsert } from '../schemas/standard-procedure.schema';

export class StandardProcedureMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: StandardProcedureRow): Result<StandardProcedure, string> {
    return StandardProcedure.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      sourceActionPlanId: row.sourceActionPlanId,
      code: row.code,
      title: row.title,
      problemDescription: row.problemDescription,
      rootCause: row.rootCause,
      solution: row.solution,
      standardOperatingProcedure: row.standardOperatingProcedure,
      department: row.department,
      processName: row.processName,
      ownerUserId: row.ownerUserId,
      version: row.version,
      lastReviewDate: row.lastReviewDate ? new Date(row.lastReviewDate) : null,
      nextReviewDate: row.nextReviewDate ? new Date(row.nextReviewDate) : null,
      status: row.status as StandardProcedureStatus,
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: StandardProcedure): StandardProcedureInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      sourceActionPlanId: entity.sourceActionPlanId,
      code: entity.code,
      title: entity.title,
      problemDescription: entity.problemDescription,
      rootCause: entity.rootCause,
      solution: entity.solution,
      standardOperatingProcedure: entity.standardOperatingProcedure,
      department: entity.department,
      processName: entity.processName,
      ownerUserId: entity.ownerUserId,
      version: entity.version,
      lastReviewDate: entity.lastReviewDate,
      nextReviewDate: entity.nextReviewDate,
      status: entity.status,
      attachments: entity.attachments.length > 0 ? JSON.stringify(entity.attachments) : null,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
