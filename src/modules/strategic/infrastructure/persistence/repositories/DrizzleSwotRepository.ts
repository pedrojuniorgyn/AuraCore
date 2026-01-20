/**
 * Repository: DrizzleSwotRepository
 * Implementação Drizzle do repositório de análise SWOT
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, sql, gte, isNotNull } from 'drizzle-orm';
import type { 
  ISwotAnalysisRepository, 
  SwotAnalysisFilter 
} from '../../../domain/ports/output/ISwotAnalysisRepository';
import { SwotItem, type SwotQuadrant, type SwotCategory } from '../../../domain/entities/SwotItem';
import { SwotMapper } from '../mappers/SwotMapper';
import { swotAnalysisTable } from '../schemas/swot-analysis.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';

export class DrizzleSwotRepository implements ISwotAnalysisRepository {
  async findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem | null> {
    const rows = await db
      .select()
      .from(swotAnalysisTable)
      .where(
        and(
          eq(swotAnalysisTable.id, id),
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId),
          isNull(swotAnalysisTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = SwotMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: SwotAnalysisFilter): Promise<{
    items: SwotItem[];
    total: number;
  }> {
    const { 
      organizationId, branchId, strategyId, quadrant, status, 
      category, minPriorityScore, convertedOnly,
      page = 1, pageSize = 20 
    } = filter;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(swotAnalysisTable.organizationId, organizationId),
      eq(swotAnalysisTable.branchId, branchId),
      isNull(swotAnalysisTable.deletedAt)
    ];

    if (strategyId) {
      conditions.push(eq(swotAnalysisTable.strategyId, strategyId));
    }
    if (quadrant) {
      conditions.push(eq(swotAnalysisTable.quadrant, quadrant));
    }
    if (status) {
      conditions.push(eq(swotAnalysisTable.status, status));
    }
    if (category) {
      conditions.push(eq(swotAnalysisTable.category, category));
    }
    if (minPriorityScore !== undefined) {
      conditions.push(gte(swotAnalysisTable.priorityScore, String(minPriorityScore)));
    }
    if (convertedOnly) {
      conditions.push(
        sql`(${swotAnalysisTable.convertedToActionPlanId} IS NOT NULL OR ${swotAnalysisTable.convertedToGoalId} IS NOT NULL)`
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(swotAnalysisTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(swotAnalysisTable)
      .where(and(...conditions))
      .orderBy(desc(swotAnalysisTable.priorityScore));

    const rows = await queryPaginated<typeof swotAnalysisTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => SwotMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  async findByStrategy(
    strategyId: string,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]> {
    const rows = await db
      .select()
      .from(swotAnalysisTable)
      .where(
        and(
          eq(swotAnalysisTable.strategyId, strategyId),
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId),
          isNull(swotAnalysisTable.deletedAt)
        )
      )
      .orderBy(desc(swotAnalysisTable.priorityScore));

    return rows
      .map(row => SwotMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByQuadrant(
    quadrant: SwotQuadrant,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]> {
    const rows = await db
      .select()
      .from(swotAnalysisTable)
      .where(
        and(
          eq(swotAnalysisTable.quadrant, quadrant),
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId),
          isNull(swotAnalysisTable.deletedAt)
        )
      )
      .orderBy(desc(swotAnalysisTable.priorityScore));

    return rows
      .map(row => SwotMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByCategory(
    category: SwotCategory,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]> {
    const rows = await db
      .select()
      .from(swotAnalysisTable)
      .where(
        and(
          eq(swotAnalysisTable.category, category),
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId),
          isNull(swotAnalysisTable.deletedAt)
        )
      )
      .orderBy(desc(swotAnalysisTable.priorityScore));

    return rows
      .map(row => SwotMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findHighPriority(
    minPriorityScore: number,
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]> {
    const rows = await db
      .select()
      .from(swotAnalysisTable)
      .where(
        and(
          gte(swotAnalysisTable.priorityScore, String(minPriorityScore)),
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId),
          isNull(swotAnalysisTable.deletedAt)
        )
      )
      .orderBy(desc(swotAnalysisTable.priorityScore));

    return rows
      .map(row => SwotMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findUnconverted(
    organizationId: number, 
    branchId: number
  ): Promise<SwotItem[]> {
    const rows = await db
      .select()
      .from(swotAnalysisTable)
      .where(
        and(
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId),
          isNull(swotAnalysisTable.convertedToActionPlanId),
          isNull(swotAnalysisTable.convertedToGoalId),
          isNull(swotAnalysisTable.deletedAt)
        )
      )
      .orderBy(desc(swotAnalysisTable.priorityScore));

    return rows
      .map(row => SwotMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async save(entity: SwotItem): Promise<void> {
    const persistence = SwotMapper.toPersistence(entity);

    const existing = await this.exists(
      entity.id,
      entity.organizationId,
      entity.branchId
    );

    if (existing) {
      await db
        .update(swotAnalysisTable)
        .set({
          strategyId: persistence.strategyId,
          quadrant: persistence.quadrant,
          title: persistence.title,
          description: persistence.description,
          impactScore: persistence.impactScore,
          probabilityScore: persistence.probabilityScore,
          priorityScore: persistence.priorityScore,
          category: persistence.category,
          convertedToActionPlanId: persistence.convertedToActionPlanId,
          convertedToGoalId: persistence.convertedToGoalId,
          status: persistence.status,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(swotAnalysisTable.id, persistence.id),
            eq(swotAnalysisTable.organizationId, persistence.organizationId),
            eq(swotAnalysisTable.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(swotAnalysisTable).values(persistence);
    }
  }

  async delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void> {
    await db
      .update(swotAnalysisTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(swotAnalysisTable.id, id),
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId)
        )
      );
  }

  private async exists(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<boolean> {
    const rows = await db
      .select({ id: swotAnalysisTable.id })
      .from(swotAnalysisTable)
      .where(
        and(
          eq(swotAnalysisTable.id, id),
          eq(swotAnalysisTable.organizationId, organizationId),
          eq(swotAnalysisTable.branchId, branchId),
          isNull(swotAnalysisTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}
