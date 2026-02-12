/**
 * GenerateBillingPdfUseCase - Query DDD (F2.3)
 * 
 * Gera PDF da fatura via IBillingPdfGateway.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { FINANCIAL_TOKENS } from '../../infrastructure/di/tokens';
import type { IGenerateBillingPdf, GenerateBillingPdfInput, GenerateBillingPdfOutput } from '../../domain/ports/input/IBillingUseCases';
import type { IBillingPdfGateway } from '../../domain/ports/output/IBillingPdfGateway';
import { db } from '@/lib/db';
import { billingInvoices, billingItems, businessPartners } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '@/shared/infrastructure/logging';

@injectable()
export class GenerateBillingPdfUseCase implements IGenerateBillingPdf {
  constructor(
    @inject(FINANCIAL_TOKENS.BillingPdfGateway) private readonly pdfGateway: IBillingPdfGateway
  ) {}

  async execute(
    input: GenerateBillingPdfInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<GenerateBillingPdfOutput, string>> {
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

      // Return existing PDF if available
      if (invoice.pdfUrl) {
        return Result.ok({ id: input.invoiceId, pdfUrl: invoice.pdfUrl });
      }

      // Buscar items e cliente
      const items = await db.select().from(billingItems).where(eq(billingItems.billingInvoiceId, invoiceId));

      const customerRows = await db
        .select({ name: businessPartners.name })
        .from(businessPartners)
        .where(eq(businessPartners.id, invoice.customerId));

      const customerName = customerRows[0]?.name ?? 'Cliente';

      // Gerar PDF via gateway
      const pdfResult = await this.pdfGateway.generatePdf({
        billingId: invoiceId,
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
      });

      if (Result.isFail(pdfResult)) {
        return Result.fail(`PDF generation failed: ${pdfResult.error}`);
      }

      // Em produção, salvar buffer em storage (S3, Azure Blob, etc.)
      // Por ora, retornar URL placeholder
      const pdfUrl = `/api/financial/billing/${invoiceId}/pdf`;

      // Salvar URL do PDF
      await db.update(billingInvoices).set({
        pdfUrl,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      }).where(eq(billingInvoices.id, invoiceId));

      logger.info(`[GenerateBillingPdf] PDF generated for invoice ${invoice.invoiceNumber}`);

      return Result.ok({ id: input.invoiceId, pdfUrl });
    } catch (error: unknown) {
      return Result.fail(`Error generating PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
