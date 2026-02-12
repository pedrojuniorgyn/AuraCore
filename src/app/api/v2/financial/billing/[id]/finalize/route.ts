/**
 * API V2: Finalize Billing Invoice
 * POST /api/v2/financial/billing/:id/finalize - Finalizar fatura
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { FINANCIAL_TOKENS } from '@/modules/financial/infrastructure/di/FinancialModule';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

export const POST = withDI(async (request: NextRequest, context: RouteContext) => {
  const resolvedParams = await context.params;
  const ctx = await getTenantContext(request);
  const invoiceId = resolvedParams.id as string;

  const useCase = container.resolve(FINANCIAL_TOKENS.FinalizeBillingInvoiceUseCase);
  const result = await useCase.execute({
    invoiceId,
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    userId: ctx.userId,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
});
