/**
 * 📋 DrizzleCFOPDeterminationRepository - Infrastructure (REPO-002)
 * 
 * Implementação Drizzle do ICFOPDeterminationRepository.
 * F3.3: CFOP Determination
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import type { ICFOPDeterminationRepository, CFOPDeterminationFilter } from '../../../domain/ports/output/ICFOPDeterminationRepository';
import type { CFOPDetermination } from '../../../domain/entities/CFOPDetermination';
import { cfopDeterminationTable } from '../schemas/cfop-determination.schema';
import { CFOPDeterminationMapper } from '../mappers/CFOPDeterminationMapper';

@injectable()
export class DrizzleCFOPDeterminationRepository implements ICFOPDeterminationRepository {
  async findById(id: string, organizationId: number): Promise<CFOPDetermination | null> {
    const rows = await db
      .select()
      .from(cfopDeterminationTable)
      .where(
        and(
          eq(cfopDeterminationTable.id, id),
          eq(cfopDeterminationTable.organizationId, organizationId),
          isNull(cfopDeterminationTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = CFOPDeterminationMapper.toDomain(rows[0]);
    return Result.isFail(result) ? null : result.value;
  }

  async findByLookup(
    organizationId: number,
    operationType: string,
    direction: 'ENTRY' | 'EXIT',
    scope: 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN'
  ): Promise<CFOPDetermination[]> {
    const rows = await db
      .select()
      .from(cfopDeterminationTable)
      .where(
        and(
          eq(cfopDeterminationTable.organizationId, organizationId),
          eq(cfopDeterminationTable.operationType, operationType),
          eq(cfopDeterminationTable.direction, direction),
          eq(cfopDeterminationTable.scope, scope),
          eq(cfopDeterminationTable.status, 'ACTIVE'),
          isNull(cfopDeterminationTable.deletedAt)
        )
      );

    const entities: CFOPDetermination[] = [];
    for (const row of rows) {
      const result = CFOPDeterminationMapper.toDomain(row);
      if (!Result.isFail(result)) {
        entities.push(result.value);
      }
    }
    return entities;
  }

  async findMany(filter: CFOPDeterminationFilter): Promise<CFOPDetermination[]> {
    const conditions = [
      eq(cfopDeterminationTable.organizationId, filter.organizationId),
      isNull(cfopDeterminationTable.deletedAt),
    ];

    if (filter.operationType) {
      conditions.push(eq(cfopDeterminationTable.operationType, filter.operationType));
    }
    if (filter.direction) {
      conditions.push(eq(cfopDeterminationTable.direction, filter.direction));
    }
    if (filter.scope) {
      conditions.push(eq(cfopDeterminationTable.scope, filter.scope));
    }
    if (filter.documentType) {
      conditions.push(eq(cfopDeterminationTable.documentType, filter.documentType));
    }
    if (filter.status) {
      conditions.push(eq(cfopDeterminationTable.status, filter.status));
    }

    const rows = await db
      .select()
      .from(cfopDeterminationTable)
      .where(and(...conditions));

    const entities: CFOPDetermination[] = [];
    for (const row of rows) {
      const result = CFOPDeterminationMapper.toDomain(row);
      if (!Result.isFail(result)) {
        entities.push(result.value);
      }
    }
    return entities;
  }

  async save(entity: CFOPDetermination): Promise<void> {
    const data = CFOPDeterminationMapper.toPersistence(entity);

    const existing = await db
      .select({ id: cfopDeterminationTable.id })
      .from(cfopDeterminationTable)
      .where(eq(cfopDeterminationTable.id, entity.id));

    if (existing.length > 0) {
      await db
        .update(cfopDeterminationTable)
        .set({
          operationType: data.operationType,
          direction: data.direction,
          scope: data.scope,
          taxRegime: data.taxRegime,
          documentType: data.documentType,
          cfopCode: data.cfopCode,
          cfopDescription: data.cfopDescription,
          isDefault: data.isDefault,
          priority: data.priority,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(cfopDeterminationTable.id, entity.id));
    } else {
      await db.insert(cfopDeterminationTable).values(data);
    }
  }

  async delete(id: string, organizationId: number): Promise<void> {
    await db
      .update(cfopDeterminationTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(cfopDeterminationTable.id, id),
          eq(cfopDeterminationTable.organizationId, organizationId)
        )
      );
  }
}
