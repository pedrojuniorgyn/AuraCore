import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { ICategoryRepository, CategoryFilter } from '../../../domain/ports/output/ICategoryRepository';
import { financialCategoriesTable } from '../schemas/FinancialCategorySchema';

export class DrizzleCategoryRepository implements ICategoryRepository {
  async findById(id: number, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(financialCategoriesTable)
      .where(
        and(
          eq(financialCategoriesTable.id, id),
          eq(financialCategoriesTable.organizationId, organizationId),
          isNull(financialCategoriesTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findByCode(code: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(financialCategoriesTable)
      .where(
        and(
          eq(financialCategoriesTable.code, code),
          eq(financialCategoriesTable.organizationId, organizationId),
          isNull(financialCategoriesTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findMany(filter: CategoryFilter): Promise<{ items: unknown[]; total: number }> {
    const conditions = [
      eq(financialCategoriesTable.organizationId, filter.organizationId),
      isNull(financialCategoriesTable.deletedAt),
    ];

    if (filter.type) {
      conditions.push(eq(financialCategoriesTable.type, filter.type));
    }
    if (filter.status) {
      conditions.push(eq(financialCategoriesTable.status, filter.status));
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const baseQuery = db
      .select()
      .from(financialCategoriesTable)
      .where(and(...conditions))
      .orderBy(desc(financialCategoriesTable.createdAt));

    const items = await queryPaginated(baseQuery, { page, pageSize });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(financialCategoriesTable)
      .where(and(...conditions));

    return { items, total: countResult[0]?.count || 0 };
  }

  async save(category: unknown): Promise<void> {
    await db.insert(financialCategoriesTable).values(category as typeof financialCategoriesTable.$inferInsert);
  }

  async update(id: number, category: unknown): Promise<void> {
    const data = category as Record<string, unknown>;
    await db
      .update(financialCategoriesTable)
      .set({ ...data, updatedAt: new Date() } as typeof financialCategoriesTable.$inferInsert)
      .where(eq(financialCategoriesTable.id, id));
  }

  async delete(id: number, organizationId: number): Promise<void> {
    await db
      .update(financialCategoriesTable)
      .set({ deletedAt: new Date() } as typeof financialCategoriesTable.$inferInsert)
      .where(
        and(
          eq(financialCategoriesTable.id, id),
          eq(financialCategoriesTable.organizationId, organizationId)
        )
      );
  }
}
