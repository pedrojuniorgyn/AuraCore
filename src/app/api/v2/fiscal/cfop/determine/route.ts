/**
 * API V2: CFOP Determination
 * POST /api/v2/fiscal/cfop/determine - Determinar CFOP para operação
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { FISCAL_TOKENS } from '@/modules/fiscal/infrastructure/di/FiscalModule';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

export const POST = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const body = await request.json();

  const useCase = container.resolve(FISCAL_TOKENS.DetermineCFOPUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    operationType: body.operationType,
    direction: body.direction,
    scope: body.scope,
    originUf: body.originUf,
    destUf: body.destUf,
    taxRegime: body.taxRegime,
    documentType: body.documentType,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.value);
});
