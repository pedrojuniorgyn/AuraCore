/**
 * API V2: Billing Invoices (Faturas)
 * GET /api/v2/financial/billing - Listar faturas
 * POST /api/v2/financial/billing - Criar fatura
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { FINANCIAL_TOKENS } from '@/modules/financial/infrastructure/di/FinancialModule';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

const createBillingSchema = z.object({
  customerId: z.number().positive(),
  periodStart: z.string().transform(v => new Date(v)),
  periodEnd: z.string().transform(v => new Date(v)),
  billingFrequency: z.enum(['SEMANAL', 'QUINZENAL', 'MENSAL']),
  cteIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const GET = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const { searchParams } = new URL(request.url);

  const useCase = container.resolve(FINANCIAL_TOKENS.ListBillingInvoicesUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    status: searchParams.get('status') || undefined,
    customerId: searchParams.get('customerId') ? Number(searchParams.get('customerId')) : undefined,
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 50),
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
});

export const POST = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const body = await request.json();

  const parsed = createBillingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const useCase = container.resolve(FINANCIAL_TOKENS.CreateBillingInvoiceUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    userId: ctx.userId,
    customerId: parsed.data.customerId,
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    billingFrequency: parsed.data.billingFrequency,
    cteIds: parsed.data.cteIds,
    notes: parsed.data.notes,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value, { status: 201 });
});
