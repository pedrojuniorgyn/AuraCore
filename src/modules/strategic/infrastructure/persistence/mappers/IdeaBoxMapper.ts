/**
 * Mapper: IdeaBoxMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { IdeaBox, type IdeaSourceType, type ConversionTarget, type Priority } from '../../../domain/entities/IdeaBox';
import { IdeaStatus } from '../../../domain/value-objects/IdeaStatus';
import type { IdeaBoxRow, IdeaBoxInsert } from '../schemas/idea-box.schema';

export class IdeaBoxMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: IdeaBoxRow): Result<IdeaBox, string> {
    const statusResult = IdeaStatus.fromValue(row.status);
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    return IdeaBox.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      code: row.code,
      title: row.title,
      description: row.description,
      sourceType: row.sourceType as IdeaSourceType,
      category: row.category,
      submittedBy: row.submittedBy,
      submittedByName: row.submittedByName,
      department: row.department,
      urgency: row.urgency as Priority,
      importance: row.importance as Priority,
      estimatedImpact: row.estimatedImpact,
      estimatedCost: row.estimatedCost ? Number(row.estimatedCost) : null,
      estimatedCostCurrency: row.estimatedCostCurrency ?? 'BRL',
      estimatedBenefit: row.estimatedBenefit ? Number(row.estimatedBenefit) : null,
      estimatedBenefitCurrency: row.estimatedBenefitCurrency ?? 'BRL',
      status: statusResult.value,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
      reviewNotes: row.reviewNotes,
      convertedTo: row.convertedTo as ConversionTarget | null,
      convertedEntityId: row.convertedEntityId,
      convertedAt: row.convertedAt ? new Date(row.convertedAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: IdeaBox): IdeaBoxInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      code: entity.code,
      title: entity.title,
      description: entity.description,
      sourceType: entity.sourceType,
      category: entity.category,
      submittedBy: entity.submittedBy,
      submittedByName: entity.submittedByName,
      department: entity.department,
      urgency: entity.urgency,
      importance: entity.importance,
      estimatedImpact: entity.estimatedImpact,
      estimatedCost: entity.estimatedCost !== null ? String(entity.estimatedCost) : null,
      estimatedCostCurrency: entity.estimatedCostCurrency,
      estimatedBenefit: entity.estimatedBenefit !== null ? String(entity.estimatedBenefit) : null,
      estimatedBenefitCurrency: entity.estimatedBenefitCurrency,
      status: entity.status.value,
      reviewedBy: entity.reviewedBy,
      reviewedAt: entity.reviewedAt,
      reviewNotes: entity.reviewNotes,
      convertedTo: entity.convertedTo,
      convertedEntityId: entity.convertedEntityId,
      convertedAt: entity.convertedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
