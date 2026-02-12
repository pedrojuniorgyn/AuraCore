/**
 * API V2: Trial Balance (Balancete de Verificação)
 * GET /api/v2/accounting/trial-balance?year=2026&month=1
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { ACCOUNTING_TOKENS } from '@/modules/accounting/infrastructure/di/AccountingModule';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

export const GET = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  const month = Number(searchParams.get('month') ?? (new Date().getMonth() + 1));

  const useCase = container.resolve(ACCOUNTING_TOKENS.GenerateTrialBalanceUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    year,
    month,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
});
