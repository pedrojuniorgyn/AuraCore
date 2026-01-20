/**
 * Mapper: SwotMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { 
  SwotItem, 
  type SwotQuadrant, 
  type SwotStatus, 
  type SwotCategory 
} from '../../../domain/entities/SwotItem';
import type { SwotAnalysisRow, SwotAnalysisInsert } from '../schemas/swot-analysis.schema';

export class SwotMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: SwotAnalysisRow): Result<SwotItem, string> {
    return SwotItem.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      strategyId: row.strategyId,
      quadrant: row.quadrant as SwotQuadrant,
      title: row.title,
      description: row.description,
      impactScore: Number(row.impactScore),
      probabilityScore: Number(row.probabilityScore),
      priorityScore: row.priorityScore ? Number(row.priorityScore) : 
        Number(row.impactScore) * Number(row.probabilityScore),
      category: row.category as SwotCategory | null,
      convertedToActionPlanId: row.convertedToActionPlanId,
      convertedToGoalId: row.convertedToGoalId,
      status: row.status as SwotStatus,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: SwotItem): SwotAnalysisInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      strategyId: entity.strategyId,
      quadrant: entity.quadrant,
      title: entity.title,
      description: entity.description,
      impactScore: String(entity.impactScore),
      probabilityScore: String(entity.probabilityScore),
      priorityScore: String(entity.priorityScore),
      category: entity.category,
      convertedToActionPlanId: entity.convertedToActionPlanId,
      convertedToGoalId: entity.convertedToGoalId,
      status: entity.status,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
