/**
 * Repository: DrizzleControlItemRepository
 * Implementação Drizzle do IControlItemRepository
 *
 * ⚠️ MULTI-TENANCY: Todas as queries DEVEM filtrar por organizationId E branchId
 *
 * @module strategic/infrastructure/persistence/repositories
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IControlItemRepository, ControlItemFilters } from '../../../domain/ports/output/IControlItemRepository';
import type { ControlItem } from '../../../domain/entities/ControlItem';
import { ControlItemMapper } from '../mappers/ControlItemMapper';
import { controlItemTable } from '../schemas/control-item.schema';
import { Result } from '@/shared/domain';

@injectable()
export class DrizzleControlItemRepository implements IControlItemRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<ControlItem | null> {
    const rows = await db
      .select()
      .from(controlItemTable)
      .where(
        and(
          eq(controlItemTable.id, id),
          eq(controlItemTable.organizationId, organizationId),
          eq(controlItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(controlItemTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = ControlItemMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByCode(
    code: string,
    organizationId: number,
    branchId: number
  ): Promise<ControlItem | null> {
    const rows = await db
      .select()
      .from(controlItemTable)
      .where(
        and(
          eq(controlItemTable.code, code),
          eq(controlItemTable.organizationId, organizationId),
          eq(controlItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(controlItemTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = ControlItemMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findAll(
    organizationId: number,
    branchId: number,
    filters?: ControlItemFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ items: ControlItem[]; total: number }> {
    // ⚠️ MULTI-TENANCY: Sempre filtrar por org + branch
    const conditions = [
      eq(controlItemTable.organizationId, organizationId),
      eq(controlItemTable.branchId, branchId),
      isNull(controlItemTable.deletedAt),
    ];

    if (filters?.processArea) {
      conditions.push(eq(controlItemTable.processArea, filters.processArea));
    }
    if (filters?.status) {
      conditions.push(eq(controlItemTable.status, filters.status));
    }
    if (filters?.kpiId) {
      conditions.push(eq(controlItemTable.kpiId, filters.kpiId));
    }
    if (filters?.responsibleUserId) {
      conditions.push(eq(controlItemTable.responsibleUserId, filters.responsibleUserId));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(controlItemTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(controlItemTable)
      .where(and(...conditions))
      .orderBy(desc(controlItemTable.createdAt));

    const rows = await queryPaginated<typeof controlItemTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    return {
      items: ControlItemMapper.toDomainList(rows),
      total,
    };
  }

  async findByKpiId(
    kpiId: string,
    organizationId: number,
    branchId: number
  ): Promise<ControlItem[]> {
    const rows = await db
      .select()
      .from(controlItemTable)
      .where(
        and(
          eq(controlItemTable.kpiId, kpiId),
          eq(controlItemTable.organizationId, organizationId),
          eq(controlItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(controlItemTable.deletedAt)
        )
      );

    return ControlItemMapper.toDomainList(rows);
  }

  async findPendingMeasurement(
    organizationId: number,
    branchId: number
  ): Promise<ControlItem[]> {
    const rows = await db
      .select()
      .from(controlItemTable)
      .where(
        and(
          eq(controlItemTable.organizationId, organizationId),
          eq(controlItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          eq(controlItemTable.status, 'ACTIVE'),
          isNull(controlItemTable.deletedAt)
        )
      );

    // Filtrar por frequência usando lastMeasuredAt da row (não exposto na Entity)
    const now = new Date();
    const filteredRows = rows.filter((row) => {
      if (!row.lastMeasuredAt) return true;

      const lastMeasured = new Date(row.lastMeasuredAt);
      const diffDays = Math.floor((now.getTime() - lastMeasured.getTime()) / (1000 * 60 * 60 * 24));

      switch (row.measurementFrequency) {
        case 'DAILY': return diffDays >= 1;
        case 'WEEKLY': return diffDays >= 7;
        case 'MONTHLY': return diffDays >= 30;
        case 'QUARTERLY': return diffDays >= 90;
        default: return false;
      }
    });

    return ControlItemMapper.toDomainList(filteredRows);
  }

  async save(entity: ControlItem): Promise<Result<void, string>> {
    try {
      const row = ControlItemMapper.toPersistence(entity);

      // Check if exists
      const existing = await db
        .select()
        .from(controlItemTable)
        .where(
          and(
            eq(controlItemTable.id, entity.id),
            eq(controlItemTable.organizationId, entity.organizationId),
            eq(controlItemTable.branchId, entity.branchId)
          )
        );

      if (existing.length > 0) {
        // Update
        await db
          .update(controlItemTable)
          .set({
            ...row,
            updatedAt: new Date(),
          })
          .where(eq(controlItemTable.id, entity.id));
      } else {
        // Insert
        await db
          .insert(controlItemTable)
          .values(row);
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save ControlItem';
      return Result.fail(message);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number,
    deletedBy: string
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(controlItemTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(controlItemTable.id, id),
            eq(controlItemTable.organizationId, organizationId),
            eq(controlItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
            isNull(controlItemTable.deletedAt)
          )
        );

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete ControlItem';
      return Result.fail(message);
    }
  }
}
