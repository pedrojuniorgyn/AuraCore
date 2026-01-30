/**
 * Mapper: ActionPlanMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { ActionPlan, type ActionPlanStatus, type Priority, type WhoType } from '../../../domain/entities/ActionPlan';
import { PDCACycle } from '../../../domain/value-objects/PDCACycle';
import type { ActionPlanRow, ActionPlanInsert } from '../schemas/action-plan.schema';

export class ActionPlanMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: ActionPlanRow): Result<ActionPlan, string> {
    const pdcaCycleResult = PDCACycle.fromValue(row.pdcaCycle);
    if (Result.isFail(pdcaCycleResult)) {
      return Result.fail(pdcaCycleResult.error);
    }

    return ActionPlan.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      goalId: row.goalId,
      code: row.code,
      what: row.what,
      why: row.why,
      whereLocation: row.whereLocation,
      whenStart: new Date(row.whenStart),
      whenEnd: new Date(row.whenEnd),
      who: row.who,
      whoUserId: row.whoUserId ?? null,
      whoType: (row.whoType as WhoType) || 'USER',
      whoEmail: row.whoEmail ?? null,
      whoPartnerId: row.whoPartnerId ?? null,
      how: row.how,
      howMuchAmount: row.howMuchAmount ? Number(row.howMuchAmount) : null,
      howMuchCurrency: row.howMuchCurrency ?? 'BRL',
      pdcaCycle: pdcaCycleResult.value,
      completionPercent: Number(row.completionPercent),
      parentActionPlanId: row.parentActionPlanId,
      repropositionNumber: row.repropositionNumber,
      repropositionReason: row.repropositionReason,
      priority: row.priority as Priority,
      status: row.status as ActionPlanStatus,
      evidenceUrls: row.evidenceUrls ? JSON.parse(row.evidenceUrls) : [],
      nextFollowUpDate: row.nextFollowUpDate ? new Date(row.nextFollowUpDate) : null,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: ActionPlan): ActionPlanInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      goalId: entity.goalId,
      code: entity.code,
      what: entity.what,
      why: entity.why,
      whereLocation: entity.whereLocation,
      whenStart: entity.whenStart,
      whenEnd: entity.whenEnd,
      who: entity.who,
      whoUserId: entity.whoUserId ?? null,
      whoType: entity.whoType,
      whoEmail: entity.whoEmail ?? null,
      whoPartnerId: entity.whoPartnerId ?? null,
      how: entity.how,
      howMuchAmount: entity.howMuchAmount !== null ? String(entity.howMuchAmount) : null,
      howMuchCurrency: entity.howMuchCurrency,
      pdcaCycle: entity.pdcaCycle.value,
      completionPercent: String(entity.completionPercent),
      parentActionPlanId: entity.parentActionPlanId,
      repropositionNumber: entity.repropositionNumber,
      repropositionReason: entity.repropositionReason,
      priority: entity.priority,
      status: entity.status,
      evidenceUrls: entity.evidenceUrls.length > 0 ? JSON.stringify(entity.evidenceUrls) : null,
      nextFollowUpDate: entity.nextFollowUpDate,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
