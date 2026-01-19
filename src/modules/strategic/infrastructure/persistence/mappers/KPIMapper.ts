/**
 * Mapper: KPIMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { KPI, type KPIPolarity, type KPIFrequency, type KPIStatus } from '../../../domain/entities/KPI';
import type { KPIRow, KPIInsert } from '../schemas/kpi.schema';

export class KPIMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: KPIRow): Result<KPI, string> {
    return KPI.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      goalId: row.goalId,
      code: row.code,
      name: row.name,
      description: row.description,
      unit: row.unit,
      polarity: row.polarity as KPIPolarity,
      frequency: row.frequency as KPIFrequency,
      targetValue: Number(row.targetValue),
      currentValue: Number(row.currentValue),
      baselineValue: row.baselineValue ? Number(row.baselineValue) : null,
      alertThreshold: Number(row.alertThreshold),
      criticalThreshold: Number(row.criticalThreshold),
      autoCalculate: row.autoCalculate ?? false,
      sourceModule: row.sourceModule,
      sourceQuery: row.sourceQuery,
      status: row.status as KPIStatus,
      lastCalculatedAt: row.lastCalculatedAt ? new Date(row.lastCalculatedAt) : null,
      ownerUserId: row.ownerUserId,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: KPI): KPIInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      goalId: entity.goalId,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      unit: entity.unit,
      polarity: entity.polarity,
      frequency: entity.frequency,
      targetValue: String(entity.targetValue),
      currentValue: String(entity.currentValue),
      baselineValue: entity.baselineValue !== null ? String(entity.baselineValue) : null,
      alertThreshold: String(entity.alertThreshold),
      criticalThreshold: String(entity.criticalThreshold),
      autoCalculate: entity.autoCalculate,
      sourceModule: entity.sourceModule,
      sourceQuery: entity.sourceQuery,
      status: entity.status,
      lastCalculatedAt: entity.lastCalculatedAt,
      ownerUserId: entity.ownerUserId,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
