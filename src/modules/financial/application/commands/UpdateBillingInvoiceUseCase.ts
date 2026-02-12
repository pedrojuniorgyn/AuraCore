/**
 * UpdateBillingInvoiceUseCase - Command DDD (F2.3)
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IUpdateBillingInvoice, UpdateBillingInvoiceInput, UpdateBillingInvoiceOutput } from '../../domain/ports/input/IBillingUseCases';
import { db } from '@/lib/db';
import { billingInvoices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

@injectable()
export class UpdateBillingInvoiceUseCase implements IUpdateBillingInvoice {
  async execute(
    input: UpdateBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<UpdateBillingInvoiceOutput, string>> {
    try {
      const invoiceId = Number(input.invoiceId);
      const rows = await db.select().from(billingInvoices).where(
        and(eq(billingInvoices.id, invoiceId), eq(billingInvoices.organizationId, ctx.organizationId))
      );

      const invoice = rows[0];
      if (!invoice) return Result.fail('Billing invoice not found');
      if (invoice.status !== 'DRAFT') return Result.fail(`Cannot update invoice in status ${invoice.status}`);

      const updatedFields: string[] = [];
      const updates: Record<string, unknown> = { updatedBy: ctx.userId, updatedAt: new Date() };

      if (input.dueDate) { updates.dueDate = new Date(input.dueDate); updatedFields.push('dueDate'); }
      if (input.discountValue !== undefined) {
        updates.discountValue = String(input.discountValue);
        updates.netValue = String(Number(invoice.grossValue) - input.discountValue);
        updatedFields.push('discountValue', 'netValue');
      }
      if (input.notes !== undefined) { updates.notes = input.notes; updatedFields.push('notes'); }

      if (updatedFields.length === 0) return Result.fail('No fields to update');

      await db.update(billingInvoices).set(updates).where(eq(billingInvoices.id, invoiceId));

      return Result.ok({ id: input.invoiceId, updatedFields });
    } catch (error: unknown) {
      return Result.fail(`Error updating billing invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
