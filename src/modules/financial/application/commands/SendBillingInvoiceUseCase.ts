/**
 * SendBillingInvoiceUseCase - Command DDD (F2.3)
 * 
 * Envia fatura por email ao cliente.
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ISendBillingInvoice, SendBillingInvoiceInput, SendBillingInvoiceOutput } from '../../domain/ports/input/IBillingUseCases';
import { db } from '@/lib/db';
import { billingInvoices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/shared/infrastructure/logging';

@injectable()
export class SendBillingInvoiceUseCase implements ISendBillingInvoice {
  async execute(
    input: SendBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<SendBillingInvoiceOutput, string>> {
    try {
      const invoiceId = Number(input.invoiceId);
      const rows = await db.select().from(billingInvoices).where(
        and(eq(billingInvoices.id, invoiceId), eq(billingInvoices.organizationId, ctx.organizationId))
      );

      const invoice = rows[0];
      if (!invoice) return Result.fail('Billing invoice not found');
      if (invoice.status === 'CANCELLED') return Result.fail('Cannot send cancelled invoice');
      if (invoice.status === 'DRAFT') return Result.fail('Finalize invoice before sending');

      const email = input.recipientEmail.trim();
      if (!email || !email.includes('@')) return Result.fail('Valid email is required');

      const sentAt = new Date();

      // TODO: Integrar com serviço de email real (SendGrid, SES, etc.)
      logger.info(`[SendBillingInvoice] Sending invoice ${invoice.invoiceNumber} to ${email}`);

      await db.update(billingInvoices).set({
        sentAt,
        sentTo: email,
        status: 'SENT',
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      }).where(eq(billingInvoices.id, invoiceId));

      return Result.ok({
        id: input.invoiceId,
        sentTo: email,
        sentAt: sentAt.toISOString(),
      });
    } catch (error: unknown) {
      return Result.fail(`Error sending billing invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
