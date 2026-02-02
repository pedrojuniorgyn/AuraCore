/**
 * Repository: DrizzleStrategyRepository
 * Implementação Drizzle do repositório de estratégias
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import type { IStrategyRepository, StrategyFilter } from '../../../domain/ports/output/IStrategyRepository';
import { Strategy, type StrategyVersionType } from '../../../domain/entities/Strategy';
import { StrategyMapper } from '../mappers/StrategyMapper';
import { strategyTable } from '../schemas/strategy.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';
import { injectable } from 'tsyringe';

@injectable()
export class DrizzleStrategyRepository implements IStrategyRepository {
  async findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<Strategy | null> {
    const rows = await db
      .select()
      .from(strategyTable)
      .where(
        and(
          eq(strategyTable.id, id),
          eq(strategyTable.organizationId, organizationId),
          eq(strategyTable.branchId, branchId),
          isNull(strategyTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StrategyMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findActive(
    organizationId: number,
    branchId: number
  ): Promise<Strategy | null> {
    const rows = await db
      .select()
      .from(strategyTable)
      .where(
        and(
          eq(strategyTable.organizationId, organizationId),
          eq(strategyTable.branchId, branchId),
          eq(strategyTable.status, 'ACTIVE'),
          eq(strategyTable.versionType, 'ACTUAL'),
          isNull(strategyTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StrategyMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: StrategyFilter): Promise<{
    items: Strategy[];
    total: number;
  }> {
    const { organizationId, branchId, status, page = 1, pageSize = 20 } = filter;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(strategyTable.organizationId, organizationId),
      eq(strategyTable.branchId, branchId),
      isNull(strategyTable.deletedAt)
    ];

    if (status) {
      conditions.push(eq(strategyTable.status, status));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(strategyTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(strategyTable)
      .where(and(...conditions))
      .orderBy(desc(strategyTable.createdAt));

    const rows = await queryPaginated<typeof strategyTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => StrategyMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  async save(entity: Strategy): Promise<Result<void, string>> {
    try {
      const persistence = StrategyMapper.toPersistence(entity);

      const existing = await this.exists(
        entity.id,
        entity.organizationId,
        entity.branchId
      );

      if (existing) {
        await db
          .update(strategyTable)
          .set({
            name: persistence.name,
            vision: persistence.vision,
            mission: persistence.mission,
            values: persistence.values,
            startDate: persistence.startDate,
            endDate: persistence.endDate,
            status: persistence.status,
            versionType: persistence.versionType,
            versionName: persistence.versionName,
            parentStrategyId: persistence.parentStrategyId,
            isLocked: persistence.isLocked,
            lockedAt: persistence.lockedAt,
            lockedBy: persistence.lockedBy,
            workflowStatus: persistence.workflowStatus,
            submittedAt: persistence.submittedAt,
            submittedByUserId: persistence.submittedByUserId,
            approvedAt: persistence.approvedAt,
            approvedByUserId: persistence.approvedByUserId,
            rejectedAt: persistence.rejectedAt,
            rejectedByUserId: persistence.rejectedByUserId,
            rejectionReason: persistence.rejectionReason,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(strategyTable.id, persistence.id),
              eq(strategyTable.organizationId, persistence.organizationId),
              eq(strategyTable.branchId, persistence.branchId)
            )
          );
      } else {
        await db.insert(strategyTable).values(persistence);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to save strategy: ${error}`);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .update(strategyTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(strategyTable.id, id),
          eq(strategyTable.organizationId, organizationId),
          eq(strategyTable.branchId, branchId)
        )
      );
  }

  async findVersionByType(
    parentId: string,
    versionType: StrategyVersionType,
    orgId: number,
    branchId: number
  ): Promise<Strategy | null> {
    const rows = await db
      .select()
      .from(strategyTable)
      .where(
        and(
          eq(strategyTable.parentStrategyId, parentId),
          eq(strategyTable.versionType, versionType),
          eq(strategyTable.organizationId, orgId),
          eq(strategyTable.branchId, branchId),
          isNull(strategyTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StrategyMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findAllVersions(
    parentId: string,
    orgId: number,
    branchId: number
  ): Promise<Strategy[]> {
    const rows = await db
      .select()
      .from(strategyTable)
      .where(
        and(
          eq(strategyTable.parentStrategyId, parentId),
          eq(strategyTable.organizationId, orgId),
          eq(strategyTable.branchId, branchId),
          isNull(strategyTable.deletedAt)
        )
      )
      .orderBy(desc(strategyTable.createdAt));

    return rows
      .map(row => StrategyMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value!);
  }

  async findByWorkflowStatus(
    workflowStatus: string,
    organizationId: number,
    branchId: number
  ): Promise<Strategy[]> {
    const rows = await db
      .select()
      .from(strategyTable)
      .where(
        and(
          eq(strategyTable.workflowStatus, workflowStatus),
          eq(strategyTable.organizationId, organizationId),
          eq(strategyTable.branchId, branchId),
          isNull(strategyTable.deletedAt)
        )
      )
      .orderBy(desc(strategyTable.submittedAt));

    return rows
      .map(row => StrategyMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  private async exists(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<boolean> {
    const rows = await db
      .select({ id: strategyTable.id })
      .from(strategyTable)
      .where(
        and(
          eq(strategyTable.id, id),
          eq(strategyTable.organizationId, organizationId),
          eq(strategyTable.branchId, branchId),
          isNull(strategyTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}
