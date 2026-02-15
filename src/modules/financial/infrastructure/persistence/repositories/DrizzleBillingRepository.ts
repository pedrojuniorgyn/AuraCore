import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IBillingRepository, BillingInvoiceFilter } from '../../../domain/ports/output/IBillingRepository';
import { billingInvoicesTable, billingItemsTable } from '../schemas/FinancialCategorySchema';

export class DrizzleBillingRepository implements IBillingRepository {
  // ==================== Invoice Operations ====================

  async findInvoiceById(id: number, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(billingInvoicesTable)
      .where(
        and(
          eq(billingInvoicesTable.id, id),
          eq(billingInvoicesTable.organizationId, organizationId),
          isNull(billingInvoicesTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findInvoiceByNumber(invoiceNumber: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(billingInvoicesTable)
      .where(
        and(
          eq(billingInvoicesTable.invoiceNumber, invoiceNumber),
          eq(billingInvoicesTable.organizationId, organizationId),
          isNull(billingInvoicesTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findInvoices(filter: BillingInvoiceFilter): Promise<{ items: unknown[]; total: number }> {
    const conditions = [
      eq(billingInvoicesTable.organizationId, filter.organizationId),
      isNull(billingInvoicesTable.deletedAt),
    ];

    if (filter.branchId) {
      conditions.push(eq(billingInvoicesTable.branchId, filter.branchId));
    }
    if (filter.customerId) {
      conditions.push(eq(billingInvoicesTable.customerId, filter.customerId));
    }
    if (filter.status) {
      conditions.push(eq(billingInvoicesTable.status, filter.status));
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const baseQuery = db
      .select()
      .from(billingInvoicesTable)
      .where(and(...conditions))
      .orderBy(desc(billingInvoicesTable.createdAt));

    const items = await queryPaginated(baseQuery, { page, pageSize });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(billingInvoicesTable)
      .where(and(...conditions));

    return { items, total: countResult[0]?.count || 0 };
  }

  async saveInvoice(invoice: unknown): Promise<void> {
    await db.insert(billingInvoicesTable).values(invoice as typeof billingInvoicesTable.$inferInsert);
  }

  async updateInvoice(id: number, invoice: unknown): Promise<void> {
    const data = invoice as Record<string, unknown>;
    await db
      .update(billingInvoicesTable)
      .set({ ...data, updatedAt: new Date() } as typeof billingInvoicesTable.$inferInsert)
      .where(eq(billingInvoicesTable.id, id));
  }

  async deleteInvoice(id: number, organizationId: number): Promise<void> {
    await db
      .update(billingInvoicesTable)
      .set({ deletedAt: new Date() } as typeof billingInvoicesTable.$inferInsert)
      .where(
        and(
          eq(billingInvoicesTable.id, id),
          eq(billingInvoicesTable.organizationId, organizationId)
        )
      );
  }

  // ==================== Item Operations ====================

  async findItemsByInvoiceId(invoiceId: number): Promise<unknown[]> {
    return db
      .select()
      .from(billingItemsTable)
      .where(
        eq(billingItemsTable.billingInvoiceId, invoiceId)
      );
  }

  async saveItem(item: unknown): Promise<void> {
    await db.insert(billingItemsTable).values(item as typeof billingItemsTable.$inferInsert);
  }

  async deleteItemsByInvoiceId(invoiceId: number): Promise<void> {
    await db
      .delete(billingItemsTable)
      .where(eq(billingItemsTable.billingInvoiceId, invoiceId));
  }
}
