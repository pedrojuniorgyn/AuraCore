import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IMdfeRepository, MdfeFilter } from '../../../domain/ports/output/IMdfeRepository';
import { mdfeHeaderTable } from '../schemas/FiscalSchema';

export class DrizzleMdfeRepository implements IMdfeRepository {
  async findById(id: number, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(mdfeHeaderTable)
      .where(
        and(
          eq(mdfeHeaderTable.id, id),
          eq(mdfeHeaderTable.organizationId, organizationId),
          isNull(mdfeHeaderTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findByMdfeKey(mdfeKey: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(mdfeHeaderTable)
      .where(
        and(
          eq(mdfeHeaderTable.mdfeKey, mdfeKey),
          eq(mdfeHeaderTable.organizationId, organizationId),
          isNull(mdfeHeaderTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findMany(filter: MdfeFilter): Promise<{ items: unknown[]; total: number }> {
    const conditions = [
      eq(mdfeHeaderTable.organizationId, filter.organizationId),
      isNull(mdfeHeaderTable.deletedAt),
    ];

    if (filter.branchId) {
      conditions.push(eq(mdfeHeaderTable.branchId, filter.branchId));
    }
    if (filter.status) {
      conditions.push(eq(mdfeHeaderTable.status, filter.status));
    }
    if (filter.mdfeKey) {
      conditions.push(eq(mdfeHeaderTable.mdfeKey, filter.mdfeKey));
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const baseQuery = db
      .select()
      .from(mdfeHeaderTable)
      .where(and(...conditions))
      .orderBy(desc(mdfeHeaderTable.issueDate));

    const items = await queryPaginated(baseQuery, { page, pageSize });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(mdfeHeaderTable)
      .where(and(...conditions));

    return { items, total: countResult[0]?.count || 0 };
  }

  async save(mdfe: unknown): Promise<void> {
    await db.insert(mdfeHeaderTable).values(mdfe as typeof mdfeHeaderTable.$inferInsert);
  }

  async update(id: number, mdfe: unknown): Promise<void> {
    const data = mdfe as Record<string, unknown>;
    await db
      .update(mdfeHeaderTable)
      .set({ ...data, updatedAt: new Date() } as typeof mdfeHeaderTable.$inferInsert)
      .where(eq(mdfeHeaderTable.id, id));
  }

  async delete(id: number, organizationId: number): Promise<void> {
    await db
      .update(mdfeHeaderTable)
      .set({ deletedAt: new Date() } as typeof mdfeHeaderTable.$inferInsert)
      .where(
        and(
          eq(mdfeHeaderTable.id, id),
          eq(mdfeHeaderTable.organizationId, organizationId)
        )
      );
  }
}
