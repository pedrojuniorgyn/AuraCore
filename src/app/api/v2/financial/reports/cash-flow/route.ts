/**
 * API V2: Cash Flow Report
 * GET /api/v2/financial/reports/cash-flow
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { FINANCIAL_TOKENS } from '@/modules/financial/infrastructure/di/FinancialModule';
import { getTenantContext } from '@/lib/auth/context';

export const GET = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') ?? undefined;
  const endDate = searchParams.get('endDate') ?? undefined;

  const useCase = container.resolve(FINANCIAL_TOKENS.GetCashFlowUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    startDate,
    endDate,
  });

  if (result.isFail?.() || (result as { error?: string }).error) {
    return NextResponse.json({ error: 'Erro ao gerar fluxo de caixa' }, { status: 500 });
  }

  return NextResponse.json(result.value);
});
