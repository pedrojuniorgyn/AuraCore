/**
 * CreateBillingInvoiceUseCase - Command DDD (F2.3)
 * 
 * Agrupa CTes de um período/cliente em uma fatura.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { ICreateBillingInvoice, CreateBillingInvoiceInput, CreateBillingInvoiceOutput } from '../../domain/ports/input/IBillingUseCases';
import { db } from '@/lib/db';
import { billingInvoices, billingItems } from '@/modules/financial/infrastructure/persistence/schemas';
import { cteHeader } from '@/modules/fiscal/infrastructure/persistence/schemas';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { logger } from '@/shared/infrastructure/logging';

@injectable()
export class CreateBillingInvoiceUseCase implements ICreateBillingInvoice {
  constructor(
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {}

  async execute(
    input: CreateBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreateBillingInvoiceOutput, string>> {
    try {
      if (!input.cteIds || input.cteIds.length === 0) {
        return Result.fail('At least one CTe is required');
      }

      // 1. Buscar CTes
      const ctes = await db
        .select()
        .from(cteHeader)
        .where(
          and(
            inArray(cteHeader.id, input.cteIds),
            eq(cteHeader.organizationId, ctx.organizationId),
            isNull(cteHeader.deletedAt)
          )
        );

      if (ctes.length === 0) {
        return Result.fail('No CTes found for the given IDs');
      }

      // 2. Calcular valores
      const grossValue = ctes.reduce((sum, c) => sum + Number(c.totalValue), 0);

      // 3. Gerar número da fatura
      const lastInvoiceRows = await db.execute(
        sql`SELECT TOP 1 invoice_number FROM billing_invoices 
            WHERE organization_id = ${ctx.organizationId} 
            ORDER BY id DESC`
      );
      const lastNumber = (lastInvoiceRows as unknown as Array<{ invoice_number: string }>)[0]?.invoice_number;
      const nextNumber = lastNumber ? String(Number(lastNumber.replace(/\D/g, '')) + 1).padStart(6, '0') : '000001';

      // 4. Inserir fatura
      const insertResult = await db
        .insert(billingInvoices)
        .values({
          organizationId: ctx.organizationId,
          branchId: ctx.branchId,
          invoiceNumber: nextNumber,
          customerId: input.customerId,
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          billingFrequency: 'MONTHLY',
          totalCtes: ctes.length,
          grossValue: String(grossValue),
          discountValue: '0',
          netValue: String(grossValue),
          issueDate: new Date(),
          dueDate: new Date(input.dueDate),
          status: 'DRAFT',
          notes: input.notes ?? null,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        });

      // 5. Obter ID do insert
      const idResult = await db.execute(sql`SELECT SCOPE_IDENTITY() as newId`);
      const invoiceId = String((idResult as unknown as Array<{ newId: number }>)[0]?.newId ?? 0);

      // 6. Inserir billing_items
      for (const cte of ctes) {
        await db.insert(billingItems).values({
          billingInvoiceId: Number(invoiceId),
          cteId: cte.id,
          cteNumber: cte.cteNumber,
          cteSeries: cte.serie ?? '1',
          cteKey: cte.cteKey,
          cteIssueDate: cte.issueDate,
          cteValue: String(cte.totalValue),
        });
      }

      logger.info(`[CreateBillingInvoice] Invoice ${nextNumber} created with ${ctes.length} CTes (R$ ${grossValue.toFixed(2)})`);

      return Result.ok({
        invoiceId,
        invoiceNumber: nextNumber,
        totalCtes: ctes.length,
        grossValue,
        netValue: grossValue,
      });

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Result.fail(`Error creating billing invoice: ${msg}`);
    }
  }
}
