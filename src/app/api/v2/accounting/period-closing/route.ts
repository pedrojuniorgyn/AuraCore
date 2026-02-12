/**
 * API V2: Accounting Period Closing
 * POST /api/v2/accounting/period-closing - Fechar período contábil
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { ACCOUNTING_TOKENS } from '@/modules/accounting/infrastructure/di/AccountingModule';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

export const POST = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const body = await request.json();

  const useCase = container.resolve(ACCOUNTING_TOKENS.CloseAccountingPeriodUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    year: body.year,
    month: body.month,
    closedBy: ctx.userId,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value, { status: 201 });
});
