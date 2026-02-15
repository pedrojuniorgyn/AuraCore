import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { ITaxRuleRepository, TaxRuleFilter } from '../../../domain/ports/output/ITaxRuleRepository';
import { taxRulesTable } from '../schemas/FiscalSchema';

export class DrizzleTaxRuleRepository implements ITaxRuleRepository {
  async findById(id: number, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(taxRulesTable)
      .where(
        and(
          eq(taxRulesTable.id, id),
          eq(taxRulesTable.organizationId, organizationId),
          isNull(taxRulesTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findByRoute(originState: string, destinationState: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(taxRulesTable)
      .where(
        and(
          eq(taxRulesTable.originState, originState),
          eq(taxRulesTable.destinationState, destinationState),
          eq(taxRulesTable.organizationId, organizationId),
          isNull(taxRulesTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findMany(filter: TaxRuleFilter): Promise<{ items: unknown[]; total: number }> {
    const conditions = [
      eq(taxRulesTable.organizationId, filter.organizationId),
      isNull(taxRulesTable.deletedAt),
    ];

    if (filter.originState) {
      conditions.push(eq(taxRulesTable.originState, filter.originState));
    }
    if (filter.destinationState) {
      conditions.push(eq(taxRulesTable.destinationState, filter.destinationState));
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const baseQuery = db
      .select()
      .from(taxRulesTable)
      .where(and(...conditions))
      .orderBy(desc(taxRulesTable.createdAt));

    const items = await queryPaginated(baseQuery, { page, pageSize });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(taxRulesTable)
      .where(and(...conditions));

    return { items, total: countResult[0]?.count || 0 };
  }

  async save(taxRule: unknown): Promise<void> {
    await db.insert(taxRulesTable).values(taxRule as typeof taxRulesTable.$inferInsert);
  }

  async update(id: number, taxRule: unknown): Promise<void> {
    const data = taxRule as Record<string, unknown>;
    await db
      .update(taxRulesTable)
      .set({ ...data, updatedAt: new Date() } as typeof taxRulesTable.$inferInsert)
      .where(eq(taxRulesTable.id, id));
  }

  async delete(id: number, organizationId: number): Promise<void> {
    await db
      .update(taxRulesTable)
      .set({ deletedAt: new Date() } as typeof taxRulesTable.$inferInsert)
      .where(
        and(
          eq(taxRulesTable.id, id),
          eq(taxRulesTable.organizationId, organizationId)
        )
      );
  }
}
