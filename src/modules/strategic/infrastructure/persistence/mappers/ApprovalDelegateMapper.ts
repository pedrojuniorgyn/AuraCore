/**
 * Mapper: ApprovalDelegateMapper
 * Conversão entre Domain Entity e Database Row
 * 
 * @module strategic/infrastructure/persistence/mappers
 * @see MAPPER-001 a MAPPER-008
 */
import { Result } from '@/shared/domain';
import { ApprovalDelegate } from '../../../domain/entities/ApprovalDelegate';
import type {
  ApprovalDelegateRow,
  ApprovalDelegateInsert,
} from '../schemas/approval-delegate.schema';

export class ApprovalDelegateMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   * @see MAPPER-004
   */
  static toDomain(row: ApprovalDelegateRow): Result<ApprovalDelegate, string> {
    return ApprovalDelegate.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      delegatorUserId: row.delegatorUserId,
      delegateUserId: row.delegateUserId,
      startDate: new Date(row.startDate),
      endDate: row.endDate ? new Date(row.endDate) : null,
      isActive: Boolean(row.isActive),
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(delegate: ApprovalDelegate): ApprovalDelegateInsert {
    return {
      id: delegate.id,
      organizationId: delegate.organizationId,
      branchId: delegate.branchId,
      delegatorUserId: delegate.delegatorUserId,
      delegateUserId: delegate.delegateUserId,
      startDate: delegate.startDate,
      endDate: delegate.endDate,
      isActive: delegate.isActive,
      createdBy: delegate.createdBy,
      createdAt: delegate.createdAt,
      updatedAt: delegate.updatedAt,
    };
  }
}
