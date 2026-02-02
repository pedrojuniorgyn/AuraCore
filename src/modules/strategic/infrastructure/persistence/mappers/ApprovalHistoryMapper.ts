/**
 * Mapper: ApprovalHistoryMapper
 * Converte entre Domain e Persistence para ApprovalHistory
 *
 * @module strategic/infrastructure/persistence/mappers
 * @see ADR-0021
 */
import { Result } from '@/shared/domain';
import { ApprovalHistory, ApprovalAction } from '@/modules/strategic/domain/entities/ApprovalHistory';
import type { approvalHistoryTable } from '../schemas/approval-history.schema';

type PersistenceApprovalHistory = typeof approvalHistoryTable.$inferSelect;

export class ApprovalHistoryMapper {
  /**
   * Converte de Persistence para Domain
   */
  static toDomain(raw: PersistenceApprovalHistory): Result<ApprovalHistory, string> {
    return ApprovalHistory.reconstitute({
      id: raw.id,
      organizationId: raw.organizationId,
      branchId: raw.branchId,
      strategyId: raw.strategyId,
      action: raw.action as ApprovalAction,
      fromStatus: raw.fromStatus,
      toStatus: raw.toStatus,
      actorUserId: raw.actorUserId,
      comments: raw.comments ?? null,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Converte de Domain para Persistence
   */
  static toPersistence(domain: ApprovalHistory): typeof approvalHistoryTable.$inferInsert {
    return {
      id: domain.id,
      organizationId: domain.organizationId,
      branchId: domain.branchId,
      strategyId: domain.strategyId,
      action: domain.action,
      fromStatus: domain.fromStatus,
      toStatus: domain.toStatus,
      actorUserId: domain.actorUserId,
      comments: domain.comments,
      createdBy: domain.createdBy,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      deletedAt: null,
    };
  }
}
