/**
 * Repository: DrizzleIdeaBoxRepository
 * Implementação Drizzle do repositório de Banco de Ideias
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import type { IIdeaBoxRepository, IdeaBoxFilter } from '../../../domain/ports/output/IIdeaBoxRepository';
import { IdeaBox } from '../../../domain/entities/IdeaBox';
import { IdeaBoxMapper } from '../mappers/IdeaBoxMapper';
import { ideaBoxTable } from '../schemas/idea-box.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';

export class DrizzleIdeaBoxRepository implements IIdeaBoxRepository {
  async findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<IdeaBox | null> {
    const rows = await db
      .select()
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.id, id),
          eq(ideaBoxTable.organizationId, organizationId),
          eq(ideaBoxTable.branchId, branchId),
          isNull(ideaBoxTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = IdeaBoxMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByCode(
    code: string, 
    organizationId: number, 
    branchId: number
  ): Promise<IdeaBox | null> {
    const rows = await db
      .select()
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.code, code.toUpperCase()),
          eq(ideaBoxTable.organizationId, organizationId),
          eq(ideaBoxTable.branchId, branchId),
          isNull(ideaBoxTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = IdeaBoxMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: IdeaBoxFilter): Promise<{
    items: IdeaBox[];
    total: number;
  }> {
    const { 
      organizationId, branchId, submittedBy, status, 
      sourceType, department, urgency, importance,
      page = 1, pageSize = 20 
    } = filter;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(ideaBoxTable.organizationId, organizationId),
      eq(ideaBoxTable.branchId, branchId),
      isNull(ideaBoxTable.deletedAt)
    ];

    if (submittedBy) {
      conditions.push(eq(ideaBoxTable.submittedBy, submittedBy));
    }
    if (status) {
      conditions.push(eq(ideaBoxTable.status, status));
    }
    if (sourceType) {
      conditions.push(eq(ideaBoxTable.sourceType, sourceType));
    }
    if (department) {
      conditions.push(eq(ideaBoxTable.department, department));
    }
    if (urgency) {
      conditions.push(eq(ideaBoxTable.urgency, urgency));
    }
    if (importance) {
      conditions.push(eq(ideaBoxTable.importance, importance));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(ideaBoxTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(ideaBoxTable)
      .where(and(...conditions))
      .orderBy(desc(ideaBoxTable.createdAt));

    const rows = await queryPaginated<typeof ideaBoxTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => IdeaBoxMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  async findPendingReview(
    organizationId: number, 
    branchId: number
  ): Promise<IdeaBox[]> {
    const rows = await db
      .select()
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.organizationId, organizationId),
          eq(ideaBoxTable.branchId, branchId),
          eq(ideaBoxTable.status, 'SUBMITTED'),
          isNull(ideaBoxTable.deletedAt)
        )
      )
      .orderBy(ideaBoxTable.createdAt);

    return rows
      .map(row => IdeaBoxMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findBySubmitter(
    submittedBy: string,
    organizationId: number, 
    branchId: number
  ): Promise<IdeaBox[]> {
    const rows = await db
      .select()
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.submittedBy, submittedBy),
          eq(ideaBoxTable.organizationId, organizationId),
          eq(ideaBoxTable.branchId, branchId),
          isNull(ideaBoxTable.deletedAt)
        )
      )
      .orderBy(desc(ideaBoxTable.createdAt));

    return rows
      .map(row => IdeaBoxMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async nextCode(
    organizationId: number, 
    branchId: number
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `IDEA-${year}-`;

    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.organizationId, organizationId),
          eq(ideaBoxTable.branchId, branchId),
          sql`${ideaBoxTable.code} LIKE ${prefix + '%'}`
        )
      );

    const count = Number(countResult[0]?.count ?? 0) + 1;
    return `${prefix}${String(count).padStart(5, '0')}`;
  }

  async save(entity: IdeaBox): Promise<void> {
    const persistence = IdeaBoxMapper.toPersistence(entity);

    const existing = await this.exists(
      entity.id,
      entity.organizationId,
      entity.branchId
    );

    if (existing) {
      await db
        .update(ideaBoxTable)
        .set({
          code: persistence.code,
          title: persistence.title,
          description: persistence.description,
          sourceType: persistence.sourceType,
          category: persistence.category,
          submittedByName: persistence.submittedByName,
          department: persistence.department,
          urgency: persistence.urgency,
          importance: persistence.importance,
          estimatedImpact: persistence.estimatedImpact,
          estimatedCost: persistence.estimatedCost,
          estimatedCostCurrency: persistence.estimatedCostCurrency,
          estimatedBenefit: persistence.estimatedBenefit,
          estimatedBenefitCurrency: persistence.estimatedBenefitCurrency,
          status: persistence.status,
          reviewedBy: persistence.reviewedBy,
          reviewedAt: persistence.reviewedAt,
          reviewNotes: persistence.reviewNotes,
          convertedTo: persistence.convertedTo,
          convertedEntityId: persistence.convertedEntityId,
          convertedAt: persistence.convertedAt,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(ideaBoxTable.id, persistence.id),
            eq(ideaBoxTable.organizationId, persistence.organizationId),
            eq(ideaBoxTable.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(ideaBoxTable).values(persistence);
    }
  }

  async delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void> {
    await db
      .update(ideaBoxTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(ideaBoxTable.id, id),
          eq(ideaBoxTable.organizationId, organizationId),
          eq(ideaBoxTable.branchId, branchId)
        )
      );
  }

  private async exists(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<boolean> {
    const rows = await db
      .select({ id: ideaBoxTable.id })
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.id, id),
          eq(ideaBoxTable.organizationId, organizationId),
          eq(ideaBoxTable.branchId, branchId),
          isNull(ideaBoxTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}
