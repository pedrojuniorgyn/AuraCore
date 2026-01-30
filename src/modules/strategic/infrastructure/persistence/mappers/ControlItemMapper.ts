/**
 * Mapper: ControlItemMapper
 * Converte entre ControlItem (domain) e schema row (persistence)
 *
 * @module strategic/infrastructure/persistence/mappers
 */
import { ControlItem } from '../../../domain/entities/ControlItem';
import type { ControlItemRow } from '../schemas/control-item.schema';
import { Result } from '@/shared/domain';

export class ControlItemMapper {
  /**
   * Converte row do banco para Entity de domínio
   */
  static toDomain(row: ControlItemRow): Result<ControlItem, string> {
    return ControlItem.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      processArea: row.processArea,
      responsibleUserId: row.responsibleUserId,
      measurementFrequency: row.measurementFrequency as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY',
      unit: row.unit,
      targetValue: Number(row.targetValue),
      upperLimit: Number(row.upperLimit),
      lowerLimit: Number(row.lowerLimit),
      currentValue: Number(row.currentValue),
      status: row.status as 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW',
      kpiId: row.kpiId ?? null,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /**
   * Converte Entity de domínio para row do banco
   */
  static toPersistence(entity: ControlItem): ControlItemRow {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      processArea: entity.processArea,
      responsibleUserId: entity.responsibleUserId,
      measurementFrequency: entity.measurementFrequency,
      unit: entity.unit,
      targetValue: String(entity.targetValue),
      upperLimit: String(entity.upperLimit),
      lowerLimit: String(entity.lowerLimit),
      currentValue: String(entity.currentValue),
      status: entity.status,
      kpiId: entity.kpiId,
      lastMeasuredAt: null, // Gerenciado no repository
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: null, // Gerenciado no repository
    };
  }

  /**
   * Converte array de rows para array de Entities
   */
  static toDomainList(rows: ControlItemRow[]): ControlItem[] {
    const items: ControlItem[] = [];
    for (const row of rows) {
      const result = this.toDomain(row);
      if (Result.isOk(result)) {
        items.push(result.value);
      }
    }
    return items;
  }
}
