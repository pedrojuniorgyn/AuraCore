/**
 * Mapper: ActionPlanFollowUpMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { ActionPlanFollowUp, type ProblemSeverity } from '../../../domain/entities/ActionPlanFollowUp';
import { ExecutionStatus } from '../../../domain/value-objects/ExecutionStatus';
import type { ActionPlanFollowUpRow, ActionPlanFollowUpInsert } from '../schemas/action-plan-follow-up.schema';

export class ActionPlanFollowUpMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: ActionPlanFollowUpRow): Result<ActionPlanFollowUp, string> {
    // Reconstituir ExecutionStatus do valor string
    const statusResult = ExecutionStatus.fromValue(row.executionStatus);
    if (Result.isFail(statusResult)) {
      return Result.fail(`Erro ao mapear executionStatus: ${statusResult.error}`);
    }

    return ActionPlanFollowUp.reconstitute({
      id: row.id,
      actionPlanId: row.actionPlanId,
      followUpNumber: row.followUpNumber,
      followUpDate: new Date(row.followUpDate),
      gembaLocal: row.gembaLocal,
      gembutsuObservation: row.gembutsuObservation,
      genjitsuData: row.genjitsuData,
      executionStatus: statusResult.value,
      executionPercent: Number(row.executionPercent),
      problemsObserved: row.problemsObserved,
      problemSeverity: row.problemSeverity as ProblemSeverity | null,
      requiresNewPlan: row.requiresNewPlan ?? false,
      newPlanDescription: row.newPlanDescription,
      newPlanAssignedTo: row.newPlanAssignedTo,
      childActionPlanId: row.childActionPlanId,
      verifiedBy: row.verifiedBy,
      verifiedAt: new Date(row.verifiedAt),
      evidenceUrls: row.evidenceUrls ? JSON.parse(row.evidenceUrls) : [],
      createdAt: new Date(row.createdAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: ActionPlanFollowUp): ActionPlanFollowUpInsert {
    return {
      id: entity.id,
      actionPlanId: entity.actionPlanId,
      followUpNumber: entity.followUpNumber,
      followUpDate: entity.followUpDate,
      gembaLocal: entity.gembaLocal,
      gembutsuObservation: entity.gembutsuObservation,
      genjitsuData: entity.genjitsuData,
      executionStatus: entity.executionStatus.value,
      executionPercent: String(entity.executionPercent),
      problemsObserved: entity.problemsObserved,
      problemSeverity: entity.problemSeverity,
      requiresNewPlan: entity.requiresNewPlan,
      newPlanDescription: entity.newPlanDescription,
      newPlanAssignedTo: entity.newPlanAssignedTo,
      childActionPlanId: entity.childActionPlanId,
      verifiedBy: entity.verifiedBy,
      verifiedAt: entity.verifiedAt,
      evidenceUrls: entity.evidenceUrls.length > 0 ? JSON.stringify(entity.evidenceUrls) : null,
      createdAt: entity.createdAt,
    };
  }
}
