/**
 * Mapper: VerificationItemMapper
 * Converte entre VerificationItem (domain) e schema row (persistence)
 *
 * @module strategic/infrastructure/persistence/mappers
 */
import { VerificationItem } from '../../../domain/entities/VerificationItem';
import type { VerificationItemRow } from '../schemas/verification-item.schema';
import { Result } from '@/shared/domain';
import type { VerificationFrequency, VerificationItemStatus } from '../../../domain/entities/VerificationItem';

export class VerificationItemMapper {
  /**
   * Converte row do banco para Entity de domínio
   */
  static toDomain(row: VerificationItemRow): Result<VerificationItem, string> {
    return VerificationItem.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      controlItemId: row.controlItemId,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      verificationMethod: row.verificationMethod,
      responsibleUserId: row.responsibleUserId,
      frequency: row.frequency as VerificationFrequency,
      standardValue: row.standardValue,
      currentValue: row.currentValue ?? null,
      lastVerifiedAt: row.lastVerifiedAt ?? null,
      lastVerifiedBy: row.lastVerifiedBy ?? null,
      status: row.status as VerificationItemStatus,
      correlationWeight: row.correlationWeight,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /**
   * Converte Entity de domínio para row do banco
   */
  static toPersistence(entity: VerificationItem): VerificationItemRow {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      controlItemId: entity.controlItemId,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      verificationMethod: entity.verificationMethod,
      responsibleUserId: entity.responsibleUserId,
      frequency: entity.frequency,
      standardValue: entity.standardValue,
      currentValue: entity.currentValue,
      lastVerifiedAt: entity.lastVerifiedAt,
      lastVerifiedBy: entity.lastVerifiedBy,
      status: entity.status,
      correlationWeight: entity.correlationWeight,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: null, // Gerenciado no repository
    };
  }

  /**
   * Converte array de rows para array de Entities
   */
  static toDomainList(rows: VerificationItemRow[]): VerificationItem[] {
    const items: VerificationItem[] = [];
    for (const row of rows) {
      const result = this.toDomain(row);
      if (Result.isOk(result)) {
        items.push(result.value);
      }
    }
    return items;
  }
}
