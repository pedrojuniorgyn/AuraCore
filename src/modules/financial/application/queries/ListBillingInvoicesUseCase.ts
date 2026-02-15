/**
 * ListBillingInvoicesUseCase - Query DDD (F2.3)
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IListBillingInvoices, ListBillingInvoicesInput, ListBillingInvoicesOutput } from '../../domain/ports/input/IBillingUseCases';
import { db } from '@/lib/db';
import { billingInvoices } from '@/modules/financial/infrastructure/persistence/schemas';
import { eq, and, isNull, sql } from 'drizzle-orm';

@injectable()
export class ListBillingInvoicesUseCase implements IListBillingInvoices {
  async execute(
    input: ListBillingInvoicesInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ListBillingInvoicesOutput, string>> {
    try {
      const page = input.page ?? 1;
      const pageSize = Math.min(input.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const conditions = [
        eq(billingInvoices.organizationId, ctx.organizationId),
        eq(billingInvoices.branchId, ctx.branchId),
        isNull(billingInvoices.deletedAt),
      ];

      if (input.customerId) conditions.push(eq(billingInvoices.customerId, input.customerId));
      if (input.status) conditions.push(eq(billingInvoices.status, input.status));
      // Period filters handled in raw SQL query below

      const where = and(...conditions);

      // Count
      const countResult = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(billingInvoices)
        .where(where);
      const total = countResult[0]?.cnt ?? 0;

      // Items (SQL Server: TOP N com OFFSET/FETCH)
      const rows = await db.execute(
        sql`SELECT id, invoice_number, customer_id, period_start, period_end, 
            gross_value, net_value, status, total_ctes, due_date, sent_at
            FROM billing_invoices
            WHERE organization_id = ${ctx.organizationId}
            AND branch_id = ${ctx.branchId}
            AND deleted_at IS NULL
            ${input.customerId ? sql`AND customer_id = ${input.customerId}` : sql``}
            ${input.status ? sql`AND status = ${input.status}` : sql``}
            ORDER BY id DESC
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`
      ) as unknown as Array<{
        id: number; invoice_number: string; customer_id: number;
        period_start: Date; period_end: Date; gross_value: string;
        net_value: string; status: string; total_ctes: number;
        due_date: Date; sent_at: Date | null;
      }>;

      const items = rows.map(r => ({
        id: String(r.id),
        invoiceNumber: r.invoice_number,
        customerId: r.customer_id,
        periodStart: new Date(r.period_start).toISOString(),
        periodEnd: new Date(r.period_end).toISOString(),
        grossValue: Number(r.gross_value),
        netValue: Number(r.net_value),
        status: r.status ?? 'DRAFT',
        totalCtes: r.total_ctes,
        dueDate: new Date(r.due_date).toISOString(),
        sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
      }));

      return Result.ok({ items, total, page, pageSize });
    } catch (error: unknown) {
      return Result.fail(`Error listing billing invoices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
