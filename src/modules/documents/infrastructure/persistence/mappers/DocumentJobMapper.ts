/**
 * DocumentJobMapper - Mapeamento entre Domain e Persistence
 * 
 * Converte entre DocumentJob Entity e DocumentJobRow
 */
import { Result } from '@/shared/domain';
import { DocumentJob } from '../../../domain/entities/DocumentJob';
import { JobStatus } from '../../../domain/value-objects/JobStatus';
import { JobType } from '../../../domain/value-objects/JobType';
import type { DocumentJobRow, DocumentJobInsert } from '../schemas/document-jobs.schema';

export class DocumentJobMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: DocumentJobRow): Result<DocumentJob, string> {
    // Parse JobStatus
    const statusResult = JobStatus.create(row.status);
    if (Result.isFail(statusResult)) {
      return Result.fail(`Erro ao mapear JobStatus: ${statusResult.error}`);
    }

    // Parse JobType
    const jobTypeResult = JobType.create(row.jobType);
    if (Result.isFail(jobTypeResult)) {
      return Result.fail(`Erro ao mapear JobType: ${jobTypeResult.error}`);
    }

    // Parse payload
    let payload: Record<string, unknown> | null = null;
    if (row.payloadJson) {
      try {
        payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
      } catch {
        payload = null;
      }
    }

    // Parse result
    let result: Record<string, unknown> | null = null;
    if (row.resultJson) {
      try {
        result = JSON.parse(row.resultJson) as Record<string, unknown>;
      } catch {
        result = null;
      }
    }

    return DocumentJob.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      documentId: row.documentId,
      jobType: jobTypeResult.value,
      status: statusResult.value,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      scheduledAt: row.scheduledAt,
      startedAt: row.startedAt ?? null,
      completedAt: row.completedAt ?? null,
      lockedAt: row.lockedAt ?? null,
      payload,
      result,
      lastError: row.lastError ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: DocumentJob): DocumentJobInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      documentId: entity.documentId,
      jobType: entity.jobType.value,
      status: entity.status.value,
      attempts: entity.attempts,
      maxAttempts: entity.maxAttempts,
      scheduledAt: entity.scheduledAt,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      lockedAt: entity.lockedAt,
      payloadJson: entity.payload ? JSON.stringify(entity.payload) : null,
      resultJson: entity.result ? JSON.stringify(entity.result) : null,
      lastError: entity.lastError,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
