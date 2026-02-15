import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { ICteRepository, CteFilter } from '../../../domain/ports/output/ICteRepository';
import { cteHeaderTable } from '../schemas/FiscalSchema';

export class DrizzleCteRepository implements ICteRepository {
  async findById(id: number, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(cteHeaderTable)
      .where(
        and(
          eq(cteHeaderTable.id, id),
          eq(cteHeaderTable.organizationId, organizationId),
          isNull(cteHeaderTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findByCteKey(cteKey: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(cteHeaderTable)
      .where(
        and(
          eq(cteHeaderTable.cteKey, cteKey),
          eq(cteHeaderTable.organizationId, organizationId),
          isNull(cteHeaderTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findByNumber(cteNumber: number, serie: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(cteHeaderTable)
      .where(
        and(
          eq(cteHeaderTable.cteNumber, cteNumber),
          eq(cteHeaderTable.serie, serie),
          eq(cteHeaderTable.organizationId, organizationId),
          isNull(cteHeaderTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findMany(filter: CteFilter): Promise<{ items: unknown[]; total: number }> {
    const conditions = [
      eq(cteHeaderTable.organizationId, filter.organizationId),
      isNull(cteHeaderTable.deletedAt),
    ];

    if (filter.branchId) {
      conditions.push(eq(cteHeaderTable.branchId, filter.branchId));
    }
    if (filter.status) {
      conditions.push(eq(cteHeaderTable.status, filter.status));
    }
    if (filter.cteKey) {
      conditions.push(eq(cteHeaderTable.cteKey, filter.cteKey));
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const baseQuery = db
      .select()
      .from(cteHeaderTable)
      .where(and(...conditions))
      .orderBy(desc(cteHeaderTable.issueDate));

    const items = await queryPaginated(baseQuery, { page, pageSize });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cteHeaderTable)
      .where(and(...conditions));

    return { items, total: countResult[0]?.count || 0 };
  }

  async save(cte: unknown): Promise<void> {
    await db.insert(cteHeaderTable).values(cte as typeof cteHeaderTable.$inferInsert);
  }

  async update(id: number, cte: unknown): Promise<void> {
    const data = cte as Record<string, unknown>;
    await db
      .update(cteHeaderTable)
      .set({ ...data, updatedAt: new Date() } as typeof cteHeaderTable.$inferInsert)
      .where(eq(cteHeaderTable.id, id));
  }

  async delete(id: number, organizationId: number): Promise<void> {
    await db
      .update(cteHeaderTable)
      .set({ deletedAt: new Date() } as typeof cteHeaderTable.$inferInsert)
      .where(
        and(
          eq(cteHeaderTable.id, id),
          eq(cteHeaderTable.organizationId, organizationId)
        )
      );
  }
}
