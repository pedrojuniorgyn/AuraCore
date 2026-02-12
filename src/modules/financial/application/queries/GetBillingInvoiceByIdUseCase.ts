/**
 * GetBillingInvoiceByIdUseCase - Query DDD (F2.3)
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IGetBillingInvoiceById, GetBillingInvoiceByIdInput, BillingInvoiceDetail } from '../../domain/ports/input/IBillingUseCases';
import { db } from '@/lib/db';
import { billingInvoices, billingItems } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

@injectable()
export class GetBillingInvoiceByIdUseCase implements IGetBillingInvoiceById {
  async execute(
    input: GetBillingInvoiceByIdInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<BillingInvoiceDetail, string>> {
    try {
      const invoiceId = Number(input.invoiceId);

      const rows = await db
        .select()
        .from(billingInvoices)
        .where(
          and(
            eq(billingInvoices.id, invoiceId),
            eq(billingInvoices.organizationId, ctx.organizationId),
            isNull(billingInvoices.deletedAt)
          )
        );

      const invoice = rows[0];
      if (!invoice) return Result.fail('Billing invoice not found');

      // Buscar items
      const items = await db
        .select()
        .from(billingItems)
        .where(eq(billingItems.billingInvoiceId, invoiceId));

      return Result.ok({
        id: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        grossValue: Number(invoice.grossValue),
        discountValue: Number(invoice.discountValue),
        netValue: Number(invoice.netValue),
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        status: invoice.status ?? 'DRAFT',
        totalCtes: invoice.totalCtes,
        accountsReceivableId: invoice.accountsReceivableId,
        pdfUrl: invoice.pdfUrl,
        sentAt: invoice.sentAt?.toISOString() ?? null,
        sentTo: invoice.sentTo,
        notes: invoice.notes,
        items: items.map(item => ({
          cteId: item.cteId,
          cteNumber: item.cteNumber,
          cteKey: item.cteKey,
          cteIssueDate: item.cteIssueDate.toISOString(),
          cteValue: Number(item.cteValue),
          originUf: item.originUf,
          destinationUf: item.destinationUf,
        })),
      });
    } catch (error: unknown) {
      return Result.fail(`Error getting billing invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
