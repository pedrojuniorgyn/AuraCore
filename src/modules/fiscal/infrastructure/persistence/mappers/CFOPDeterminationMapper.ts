/**
 * 📋 CFOPDeterminationMapper - Mapper (MAPPER-001 a MAPPER-008)
 * 
 * toDomain usa reconstitute() (MAPPER-004)
 * F3.3: CFOP Determination
 */
import { Result } from '@/shared/domain';
import { CFOPDetermination } from '../../../domain/entities/CFOPDetermination';
import type { CFOPDeterminationRow, CFOPDeterminationInsert } from '../schemas/cfop-determination.schema';

export class CFOPDeterminationMapper {
  // DB → Domain (MAPPER-002, MAPPER-004)
  static toDomain(row: CFOPDeterminationRow): Result<CFOPDetermination, string> {
    return CFOPDetermination.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      operationType: row.operationType,
      direction: row.direction as 'ENTRY' | 'EXIT',
      scope: row.scope as 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN',
      taxRegime: row.taxRegime ?? undefined,
      documentType: row.documentType ?? undefined,
      cfopCode: row.cfopCode,
      cfopDescription: row.cfopDescription,
      isDefault: Boolean(row.isDefault),
      priority: row.priority,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // Domain → DB (MAPPER-003)
  static toPersistence(entity: CFOPDetermination): CFOPDeterminationInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      operationType: entity.operationType,
      direction: entity.direction,
      scope: entity.scope,
      taxRegime: entity.taxRegime ?? null,
      documentType: entity.documentType ?? null,
      cfopCode: entity.cfopCode,
      cfopDescription: entity.cfopDescription,
      isDefault: entity.isDefault,
      priority: entity.priority,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
