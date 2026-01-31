/**
 * Mapper: StrategyMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { Strategy, type StrategyStatus, type StrategyVersionType } from '../../../domain/entities/Strategy';
import type { StrategyRow, StrategyInsert } from '../schemas/strategy.schema';

export class StrategyMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: StrategyRow): Result<Strategy, string> {
    return Strategy.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      name: row.name,
      vision: row.vision,
      mission: row.mission,
      values: row.values ? JSON.parse(row.values) : [],
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      status: row.status as StrategyStatus,
      versionType: (row.versionType as StrategyVersionType) || 'ACTUAL',
      versionName: row.versionName || undefined,
      parentStrategyId: row.parentStrategyId || undefined,
      isLocked: row.isLocked || false,
      lockedAt: row.lockedAt ? new Date(row.lockedAt) : undefined,
      lockedBy: row.lockedBy || undefined,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: Strategy): StrategyInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      name: entity.name,
      vision: entity.vision,
      mission: entity.mission,
      values: JSON.stringify(entity.values),
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      versionType: entity.versionType,
      versionName: entity.versionName || null,
      parentStrategyId: entity.parentStrategyId || null,
      isLocked: entity.isLocked,
      lockedAt: entity.lockedAt || null,
      lockedBy: entity.lockedBy || null,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
