/**
 * CancelBillingInvoiceUseCase - Command DDD (F2.3)
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ICancelBillingInvoice, CancelBillingInvoiceInput, CancelBillingInvoiceOutput } from '../../domain/ports/input/IBillingUseCases';
import { db } from '@/lib/db';
import { billingInvoices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

@injectable()
export class CancelBillingInvoiceUseCase implements ICancelBillingInvoice {
  async execute(
    input: CancelBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CancelBillingInvoiceOutput, string>> {
    try {
      const invoiceId = Number(input.invoiceId);
      const rows = await db.select().from(billingInvoices).where(
        and(eq(billingInvoices.id, invoiceId), eq(billingInvoices.organizationId, ctx.organizationId))
      );

      const invoice = rows[0];
      if (!invoice) return Result.fail('Billing invoice not found');
      if (invoice.status === 'CANCELLED') return Result.fail('Already cancelled');
      if (invoice.accountsReceivableId) {
        return Result.fail('Cannot cancel billing with linked receivable. Cancel receivable first.');
      }

      const reason = input.reason.trim();
      if (!reason) return Result.fail('Reason is required');

      const newNotes = (invoice.notes ? invoice.notes + '\n' : '') + `Cancelado: ${reason}`;

      await db.update(billingInvoices).set({
        status: 'CANCELLED',
        notes: newNotes,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      }).where(eq(billingInvoices.id, invoiceId));

      return Result.ok({ id: input.invoiceId, status: 'CANCELLED' });
    } catch (error: unknown) {
      return Result.fail(`Error cancelling billing invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
