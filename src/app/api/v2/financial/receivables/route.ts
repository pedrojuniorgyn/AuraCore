/**
 * API V2: Financial Receivables
 * POST /api/v2/financial/receivables - Criar conta a receber
 * GET  /api/v2/financial/receivables - Listar contas a receber
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { FINANCIAL_TOKENS } from '@/modules/financial/infrastructure/di/FinancialModule';
import { getTenantContext } from '@/lib/auth/context';

export const GET = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '20');
  const status = searchParams.get('status') ?? undefined;

  const useCase = container.resolve(FINANCIAL_TOKENS.ListReceivablesUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    status,
    page,
    pageSize,
  });

  if (result.isFail?.() || (result as { error?: string }).error) {
    return NextResponse.json({ error: 'Erro ao listar receivables' }, { status: 500 });
  }

  return NextResponse.json(result.value);
});

export const POST = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const body = await request.json();

  const useCase = container.resolve(FINANCIAL_TOKENS.CreateReceivableUseCase);
  const result = await useCase.execute({
    ...body,
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
  });

  if (result.isFail?.() || (result as { error?: string }).error) {
    return NextResponse.json({ error: result.error ?? 'Erro ao criar receivable' }, { status: 400 });
  }

  return NextResponse.json(result.value, { status: 201 });
});
