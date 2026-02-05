/**
 * Mapper: OkrMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/okr/infrastructure/persistence/mappers
 */
import { Result } from '../../../../../../shared/domain/types/Result';
import { OKR, type OKRLevel, type OKRStatus, type OKRPeriodType } from '../../../domain/entities/OKR';
import { KeyResult, type KeyResultMetricType, type KeyResultStatus } from '../../../domain/entities/KeyResult';
import type { OkrRow, KeyResultRow, OkrInsert, KeyResultInsert } from '../schemas/okr.schema';

export class OkrMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - MAPPER-004
   */
  static toDomain(row: OkrRow, keyResultRows: KeyResultRow[]): Result<OKR, string> {
    // Map Key Results - FALHA se algum KeyResult for inválido (Bug Fix)
    const keyResults: KeyResult[] = [];
    
    for (const krRow of keyResultRows) {
      const krResult = KeyResult.create({
        id: krRow.id, // Bug Fix: Preservar ID do banco
        title: krRow.title,
        description: krRow.description || undefined,
        metricType: krRow.metricType as KeyResultMetricType,
        startValue: krRow.startValue,
        targetValue: krRow.targetValue,
        currentValue: krRow.currentValue,
        unit: krRow.unit || undefined,
        status: krRow.status as KeyResultStatus,
        weight: krRow.weight,
        order: krRow.orderIndex,
        linkedKpiId: krRow.linkedKpiId || undefined,
        linkedActionPlanId: krRow.linkedActionPlanId || undefined,
      });

      if (Result.isOk(krResult)) {
        keyResults.push(krResult.value);
      } else {
        // Bug Fix: Falhar ao invés de ignorar silenciosamente
        return Result.fail(
          `Failed to map KeyResult (okrId: ${row.id}, title: "${krRow.title}"): ${krResult.error}`
        );
      }
    }

    // Reconstitute OKR Domain Entity (MAPPER-004)
    return OKR.reconstitute({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      level: row.level as OKRLevel,
      parentId: row.parentId || undefined,
      periodType: row.periodType as OKRPeriodType,
      periodLabel: row.periodLabel,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      ownerType: row.ownerType as 'user' | 'team' | 'department',
      keyResults,
      progress: row.progress,
      status: row.status as OKRStatus,
      organizationId: row.organizationId,
      branchId: row.branchId,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB (MAPPER-003)
   * Bug Fix: id pode ser undefined para novos KRs (gerado no Repository)
   */
  static toPersistence(entity: OKR): {
    okr: OkrInsert;
    keyResults: Array<Omit<KeyResultInsert, 'okrId' | 'id'> & { id: string | undefined }>;
  } {
    return {
      okr: {
        id: entity.id,
        title: entity.title,
        description: entity.description || null,
        level: entity.level,
        parentId: entity.parentId || null,
        periodType: entity.periodType,
        periodLabel: entity.periodLabel,
        startDate: entity.startDate,
        endDate: entity.endDate,
        ownerId: entity.ownerId,
        ownerName: entity.ownerName,
        ownerType: entity.ownerType,
        progress: entity.progress,
        status: entity.status,
        organizationId: entity.organizationId,
        branchId: entity.branchId,
        createdBy: entity.createdBy,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        deletedAt: null,
      },
      keyResults: entity.keyResults.map((kr) => ({
        id: kr.id, // Bug Fix: Preservar ID existente (undefined para novos)
        title: kr.title,
        description: kr.description || null,
        metricType: kr.metricType,
        startValue: kr.startValue,
        targetValue: kr.targetValue,
        currentValue: kr.currentValue,
        unit: kr.unit || null,
        status: kr.status,
        weight: kr.weight,
        orderIndex: kr.order, // Bug Fix: Usar kr.order ao invés de index
        linkedKpiId: kr.linkedKpiId || null,
        linkedActionPlanId: kr.linkedActionPlanId || null,
        createdBy: entity.createdBy,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
  }
}
