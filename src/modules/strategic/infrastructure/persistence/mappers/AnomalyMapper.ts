/**
 * Mapper: AnomalyMapper
 * Converte entre Anomaly (domain) e schema row (persistence)
 *
 * @module strategic/infrastructure/persistence/mappers
 */
import { Anomaly } from '../../../domain/entities/Anomaly';
import type { AnomalyRow } from '../schemas/anomaly.schema';
import { Result } from '@/shared/domain';
import type { AnomalyStatus, AnomalySeverity, AnomalySource } from '../../../domain/entities/Anomaly';

export class AnomalyMapper {
  /**
   * Converte row do banco para Entity de domínio
   */
  static toDomain(row: AnomalyRow): Result<Anomaly, string> {
    return Anomaly.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      code: row.code,
      title: row.title,
      description: row.description,
      source: row.source as AnomalySource,
      sourceEntityId: row.sourceEntityId ?? null,
      detectedAt: row.detectedAt,
      detectedBy: row.detectedBy,
      severity: row.severity as AnomalySeverity,
      processArea: row.processArea,
      responsibleUserId: row.responsibleUserId,
      status: row.status as AnomalyStatus,
      rootCauseAnalysis: row.rootCauseAnalysis ?? null,
      why1: row.why1 ?? null,
      why2: row.why2 ?? null,
      why3: row.why3 ?? null,
      why4: row.why4 ?? null,
      why5: row.why5 ?? null,
      rootCause: row.rootCause ?? null,
      actionPlanId: row.actionPlanId ?? null,
      standardProcedureId: row.standardProcedureId ?? null,
      resolution: row.resolution ?? null,
      resolvedAt: row.resolvedAt ?? null,
      resolvedBy: row.resolvedBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /**
   * Converte Entity de domínio para row do banco
   */
  static toPersistence(entity: Anomaly): AnomalyRow {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      code: entity.code,
      title: entity.title,
      description: entity.description,
      source: entity.source,
      sourceEntityId: entity.sourceEntityId,
      detectedAt: entity.detectedAt,
      detectedBy: entity.detectedBy,
      severity: entity.severity,
      processArea: entity.processArea,
      responsibleUserId: entity.responsibleUserId,
      status: entity.status,
      rootCauseAnalysis: entity.rootCauseAnalysis,
      why1: entity.why1,
      why2: entity.why2,
      why3: entity.why3,
      why4: entity.why4,
      why5: entity.why5,
      rootCause: entity.rootCause,
      actionPlanId: entity.actionPlanId,
      standardProcedureId: entity.standardProcedureId,
      resolution: entity.resolution,
      resolvedAt: entity.resolvedAt,
      resolvedBy: entity.resolvedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: null, // Gerenciado no repository
    };
  }

  /**
   * Converte array de rows para array de Entities
   */
  static toDomainList(rows: AnomalyRow[]): Anomaly[] {
    const items: Anomaly[] = [];
    for (const row of rows) {
      const result = this.toDomain(row);
      if (Result.isOk(result)) {
        items.push(result.value);
      }
    }
    return items;
  }
}
