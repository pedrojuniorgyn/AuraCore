/**
 * Repository: DrizzleAnomalyRepository
 * Implementação Drizzle do IAnomalyRepository
 *
 * ⚠️ MULTI-TENANCY: Todas as queries DEVEM filtrar por organizationId E branchId
 *
 * @module strategic/infrastructure/persistence/repositories
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, desc, sql, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IAnomalyRepository, AnomalyFilters } from '../../../domain/ports/output/IAnomalyRepository';
import type { Anomaly, AnomalyStatus, AnomalySeverity } from '../../../domain/entities/Anomaly';
import { AnomalyMapper } from '../mappers/AnomalyMapper';
import { anomalyTable } from '../schemas/anomaly.schema';
import { Result } from '@/shared/domain';

@injectable()
export class DrizzleAnomalyRepository implements IAnomalyRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly | null> {
    const rows = await db
      .select()
      .from(anomalyTable)
      .where(
        and(
          eq(anomalyTable.id, id),
          eq(anomalyTable.organizationId, organizationId),
          eq(anomalyTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(anomalyTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = AnomalyMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByStatus(
    status: AnomalyStatus,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]> {
    const rows = await db
      .select()
      .from(anomalyTable)
      .where(
        and(
          eq(anomalyTable.status, status),
          eq(anomalyTable.organizationId, organizationId),
          eq(anomalyTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(anomalyTable.deletedAt)
        )
      )
      .orderBy(desc(anomalyTable.detectedAt));

    return AnomalyMapper.toDomainList(rows);
  }

  async findBySeverity(
    severity: AnomalySeverity,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]> {
    const rows = await db
      .select()
      .from(anomalyTable)
      .where(
        and(
          eq(anomalyTable.severity, severity),
          eq(anomalyTable.organizationId, organizationId),
          eq(anomalyTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(anomalyTable.deletedAt)
        )
      )
      .orderBy(desc(anomalyTable.detectedAt));

    return AnomalyMapper.toDomainList(rows);
  }

  async findByControlItem(
    controlItemId: string,
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]> {
    const rows = await db
      .select()
      .from(anomalyTable)
      .where(
        and(
          eq(anomalyTable.source, 'CONTROL_ITEM'),
          eq(anomalyTable.sourceEntityId, controlItemId),
          eq(anomalyTable.organizationId, organizationId),
          eq(anomalyTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(anomalyTable.deletedAt)
        )
      )
      .orderBy(desc(anomalyTable.detectedAt));

    return AnomalyMapper.toDomainList(rows);
  }

  async findOpen(
    organizationId: number,
    branchId: number
  ): Promise<Anomaly[]> {
    const rows = await db
      .select()
      .from(anomalyTable)
      .where(
        and(
          eq(anomalyTable.organizationId, organizationId),
          eq(anomalyTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          notInArray(anomalyTable.status, ['RESOLVED', 'CANCELLED']),
          isNull(anomalyTable.deletedAt)
        )
      )
      .orderBy(desc(anomalyTable.detectedAt));

    return AnomalyMapper.toDomainList(rows);
  }

  async findAll(
    organizationId: number,
    branchId: number,
    filters?: AnomalyFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ items: Anomaly[]; total: number }> {
    // ⚠️ MULTI-TENANCY: Sempre filtrar por org + branch
    const conditions = [
      eq(anomalyTable.organizationId, organizationId),
      eq(anomalyTable.branchId, branchId),
      isNull(anomalyTable.deletedAt),
    ];

    if (filters?.status) {
      conditions.push(eq(anomalyTable.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(anomalyTable.severity, filters.severity));
    }
    if (filters?.source) {
      conditions.push(eq(anomalyTable.source, filters.source));
    }
    if (filters?.processArea) {
      conditions.push(eq(anomalyTable.processArea, filters.processArea));
    }
    if (filters?.responsibleUserId) {
      conditions.push(eq(anomalyTable.responsibleUserId, filters.responsibleUserId));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(anomalyTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(anomalyTable)
      .where(and(...conditions))
      .orderBy(desc(anomalyTable.detectedAt));

    const rows = await queryPaginated<typeof anomalyTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    return {
      items: AnomalyMapper.toDomainList(rows),
      total,
    };
  }

  async countBySeverity(
    organizationId: number,
    branchId: number
  ): Promise<Record<AnomalySeverity, number>> {
    const rows = await db
      .select({
        severity: anomalyTable.severity,
        count: sql<number>`COUNT(*)`,
      })
      .from(anomalyTable)
      .where(
        and(
          eq(anomalyTable.organizationId, organizationId),
          eq(anomalyTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          notInArray(anomalyTable.status, ['RESOLVED', 'CANCELLED']),
          isNull(anomalyTable.deletedAt)
        )
      )
      .groupBy(anomalyTable.severity);

    // Initialize with zeros
    const result: Record<AnomalySeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    // Populate with actual counts
    for (const row of rows) {
      const severity = row.severity as AnomalySeverity;
      result[severity] = Number(row.count);
    }

    return result;
  }

  async save(entity: Anomaly): Promise<Result<void, string>> {
    try {
      const row = AnomalyMapper.toPersistence(entity);

      // Check if exists
      const existing = await db
        .select()
        .from(anomalyTable)
        .where(
          and(
            eq(anomalyTable.id, entity.id),
            eq(anomalyTable.organizationId, entity.organizationId),
            eq(anomalyTable.branchId, entity.branchId)
          )
        );

      if (existing.length > 0) {
        // Update
        await db
          .update(anomalyTable)
          .set({
            ...row,
            updatedAt: new Date(),
          })
          .where(eq(anomalyTable.id, entity.id));
      } else {
        // Insert
        await db
          .insert(anomalyTable)
          .values(row);
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save Anomaly';
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
        .update(anomalyTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(anomalyTable.id, id),
            eq(anomalyTable.organizationId, organizationId),
            eq(anomalyTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
            isNull(anomalyTable.deletedAt)
          )
        );

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete Anomaly';
      return Result.fail(message);
    }
  }
}
