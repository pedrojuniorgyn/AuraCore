/**
 * Repository: DrizzleStandardProcedureRepository
 * Implementação Drizzle do IStandardProcedureRepository
 *
 * StandardProcedure representa a padronização de procedimentos após resolução
 * bem-sucedida de um ActionPlan (etapa ACT do ciclo PDCA)
 *
 * ⚠️ MULTI-TENANCY: Todas as queries DEVEM filtrar por organizationId E branchId
 *
 * @module strategic/infrastructure/persistence/repositories
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, desc, sql, like, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IStandardProcedureRepository, StandardProcedureFilter } from '../../../domain/ports/output/IStandardProcedureRepository';
import type { StandardProcedure } from '../../../domain/entities/StandardProcedure';
import { StandardProcedureMapper } from '../mappers/StandardProcedureMapper';
import { standardProcedureTable } from '../schemas/standard-procedure.schema';
import { Result } from '@/shared/domain';

@injectable()
export class DrizzleStandardProcedureRepository implements IStandardProcedureRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<StandardProcedure | null> {
    const rows = await db
      .select()
      .from(standardProcedureTable)
      .where(
        and(
          eq(standardProcedureTable.id, id),
          eq(standardProcedureTable.organizationId, organizationId),
          eq(standardProcedureTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(standardProcedureTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StandardProcedureMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByCode(
    code: string,
    organizationId: number,
    branchId: number
  ): Promise<StandardProcedure | null> {
    const rows = await db
      .select()
      .from(standardProcedureTable)
      .where(
        and(
          eq(standardProcedureTable.code, code),
          eq(standardProcedureTable.organizationId, organizationId),
          eq(standardProcedureTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(standardProcedureTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StandardProcedureMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findBySourceActionPlanId(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<StandardProcedure | null> {
    const rows = await db
      .select()
      .from(standardProcedureTable)
      .where(
        and(
          eq(standardProcedureTable.sourceActionPlanId, actionPlanId),
          eq(standardProcedureTable.organizationId, organizationId),
          eq(standardProcedureTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(standardProcedureTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StandardProcedureMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: StandardProcedureFilter): Promise<{
    items: StandardProcedure[];
    total: number;
  }> {
    const {
      organizationId,
      branchId,
      status,
      ownerUserId,
      department,
      processName,
      sourceActionPlanId,
      needsReview,
      page = 1,
      pageSize = 20,
    } = filter;

    // ⚠️ MULTI-TENANCY: Sempre filtrar por org + branch
    const conditions = [
      eq(standardProcedureTable.organizationId, organizationId),
      eq(standardProcedureTable.branchId, branchId),
      isNull(standardProcedureTable.deletedAt),
    ];

    if (status) {
      conditions.push(eq(standardProcedureTable.status, status));
    }
    if (ownerUserId) {
      conditions.push(eq(standardProcedureTable.ownerUserId, ownerUserId));
    }
    if (department) {
      conditions.push(eq(standardProcedureTable.department, department));
    }
    if (processName) {
      conditions.push(like(standardProcedureTable.processName, `%${processName}%`));
    }
    if (sourceActionPlanId) {
      conditions.push(eq(standardProcedureTable.sourceActionPlanId, sourceActionPlanId));
    }
    if (needsReview) {
      // Padrões que precisam de revisão: nextReviewDate <= hoje
      conditions.push(sql`${standardProcedureTable.nextReviewDate} <= GETDATE()`);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(standardProcedureTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(standardProcedureTable)
      .where(and(...conditions))
      .orderBy(desc(standardProcedureTable.createdAt));

    const rows = await queryPaginated<typeof standardProcedureTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items: StandardProcedure[] = [];
    for (const row of rows) {
      const result = StandardProcedureMapper.toDomain(row);
      if (Result.isOk(result)) {
        items.push(result.value);
      }
    }

    return { items, total };
  }

  async findNeedingReview(
    organizationId: number,
    branchId: number
  ): Promise<StandardProcedure[]> {
    const rows = await db
      .select()
      .from(standardProcedureTable)
      .where(
        and(
          eq(standardProcedureTable.organizationId, organizationId),
          eq(standardProcedureTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          eq(standardProcedureTable.status, 'ACTIVE'),
          isNotNull(standardProcedureTable.nextReviewDate),
          sql`${standardProcedureTable.nextReviewDate} <= GETDATE()`,
          isNull(standardProcedureTable.deletedAt)
        )
      )
      .orderBy(standardProcedureTable.nextReviewDate);

    const items: StandardProcedure[] = [];
    for (const row of rows) {
      const result = StandardProcedureMapper.toDomain(row);
      if (Result.isOk(result)) {
        items.push(result.value);
      }
    }

    return items;
  }

  async findActiveByDepartment(
    department: string,
    organizationId: number,
    branchId: number
  ): Promise<StandardProcedure[]> {
    const rows = await db
      .select()
      .from(standardProcedureTable)
      .where(
        and(
          eq(standardProcedureTable.department, department),
          eq(standardProcedureTable.organizationId, organizationId),
          eq(standardProcedureTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          eq(standardProcedureTable.status, 'ACTIVE'),
          isNull(standardProcedureTable.deletedAt)
        )
      )
      .orderBy(desc(standardProcedureTable.createdAt));

    const items: StandardProcedure[] = [];
    for (const row of rows) {
      const result = StandardProcedureMapper.toDomain(row);
      if (Result.isOk(result)) {
        items.push(result.value);
      }
    }

    return items;
  }

  async save(entity: StandardProcedure): Promise<void> {
    const row = StandardProcedureMapper.toPersistence(entity);

    // Check if exists
    const existing = await db
      .select()
      .from(standardProcedureTable)
      .where(
        and(
          eq(standardProcedureTable.id, entity.id),
          eq(standardProcedureTable.organizationId, entity.organizationId),
          eq(standardProcedureTable.branchId, entity.branchId)
        )
      );

    if (existing.length > 0) {
      // Update
      await db
        .update(standardProcedureTable)
        .set({
          ...row,
          updatedAt: new Date(),
        })
        .where(eq(standardProcedureTable.id, entity.id));
    } else {
      // Insert
      await db
        .insert(standardProcedureTable)
        .values(row);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .update(standardProcedureTable)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(standardProcedureTable.id, id),
          eq(standardProcedureTable.organizationId, organizationId),
          eq(standardProcedureTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(standardProcedureTable.deletedAt)
        )
      );
  }
}
