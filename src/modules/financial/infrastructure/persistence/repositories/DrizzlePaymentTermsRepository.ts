import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IPaymentTermsRepository, PaymentTermsFilter } from '../../../domain/ports/output/IPaymentTermsRepository';
import { paymentTermsTable } from '../schemas/FinancialCategorySchema';

export class DrizzlePaymentTermsRepository implements IPaymentTermsRepository {
  async findById(id: number, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(paymentTermsTable)
      .where(
        and(
          eq(paymentTermsTable.id, id),
          eq(paymentTermsTable.organizationId, organizationId),
          isNull(paymentTermsTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findByCode(code: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(paymentTermsTable)
      .where(
        and(
          eq(paymentTermsTable.code, code),
          eq(paymentTermsTable.organizationId, organizationId),
          isNull(paymentTermsTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findMany(filter: PaymentTermsFilter): Promise<{ items: unknown[]; total: number }> {
    const conditions = [
      eq(paymentTermsTable.organizationId, filter.organizationId),
      isNull(paymentTermsTable.deletedAt),
    ];

    if (filter.type) {
      conditions.push(eq(paymentTermsTable.type, filter.type));
    }
    if (filter.status) {
      conditions.push(eq(paymentTermsTable.status, filter.status));
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const baseQuery = db
      .select()
      .from(paymentTermsTable)
      .where(and(...conditions))
      .orderBy(desc(paymentTermsTable.createdAt));

    const items = await queryPaginated(baseQuery, { page, pageSize });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(paymentTermsTable)
      .where(and(...conditions));

    return { items, total: countResult[0]?.count || 0 };
  }

  async save(paymentTerm: unknown): Promise<void> {
    await db.insert(paymentTermsTable).values(paymentTerm as typeof paymentTermsTable.$inferInsert);
  }

  async update(id: number, paymentTerm: unknown): Promise<void> {
    const data = paymentTerm as Record<string, unknown>;
    await db
      .update(paymentTermsTable)
      .set({ ...data, updatedAt: new Date() } as typeof paymentTermsTable.$inferInsert)
      .where(eq(paymentTermsTable.id, id));
  }

  async delete(id: number, organizationId: number): Promise<void> {
    await db
      .update(paymentTermsTable)
      .set({ deletedAt: new Date() } as typeof paymentTermsTable.$inferInsert)
      .where(
        and(
          eq(paymentTermsTable.id, id),
          eq(paymentTermsTable.organizationId, organizationId)
        )
      );
  }
}
