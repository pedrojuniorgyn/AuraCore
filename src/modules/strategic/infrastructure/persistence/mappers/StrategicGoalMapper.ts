/**
 * Mapper: StrategicGoalMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { StrategicGoal } from '../../../domain/entities/StrategicGoal';
import { CascadeLevel } from '../../../domain/value-objects/CascadeLevel';
import { GoalStatus } from '../../../domain/value-objects/GoalStatus';
import type { StrategicGoalRow, StrategicGoalInsert } from '../schemas/strategic-goal.schema';

export class StrategicGoalMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: StrategicGoalRow): Result<StrategicGoal, string> {
    const cascadeLevelResult = CascadeLevel.fromValue(row.cascadeLevel);
    if (Result.isFail(cascadeLevelResult)) {
      return Result.fail(cascadeLevelResult.error);
    }

    const statusResult = GoalStatus.fromValue(row.status);
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    return StrategicGoal.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      perspectiveId: row.perspectiveId,
      parentGoalId: row.parentGoalId,
      code: row.code,
      description: row.description,
      cascadeLevel: cascadeLevelResult.value,
      targetValue: Number(row.targetValue),
      currentValue: Number(row.currentValue),
      baselineValue: row.baselineValue ? Number(row.baselineValue) : null,
      unit: row.unit,
      polarity: row.polarity as 'UP' | 'DOWN',
      weight: Number(row.weight),
      ownerUserId: row.ownerUserId,
      ownerBranchId: row.ownerBranchId,
      startDate: new Date(row.startDate),
      dueDate: new Date(row.dueDate),
      status: statusResult.value,
      mapPositionX: row.mapPositionX,
      mapPositionY: row.mapPositionY,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: StrategicGoal): StrategicGoalInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      perspectiveId: entity.perspectiveId,
      parentGoalId: entity.parentGoalId,
      code: entity.code,
      description: entity.description,
      cascadeLevel: entity.cascadeLevel.value,
      targetValue: String(entity.targetValue),
      currentValue: String(entity.currentValue),
      baselineValue: entity.baselineValue !== null ? String(entity.baselineValue) : null,
      unit: entity.unit,
      polarity: entity.polarity,
      weight: String(entity.weight),
      ownerUserId: entity.ownerUserId,
      ownerBranchId: entity.ownerBranchId,
      startDate: entity.startDate,
      dueDate: entity.dueDate,
      status: entity.status.value,
      mapPositionX: entity.mapPositionX,
      mapPositionY: entity.mapPositionY,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
