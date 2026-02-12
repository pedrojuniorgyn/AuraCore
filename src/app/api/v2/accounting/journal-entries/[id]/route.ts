/**
 * API V2: Journal Entry by ID
 * GET /api/v2/accounting/journal-entries/:id - Obter lançamento
 * POST /api/v2/accounting/journal-entries/:id/post - Postar lançamento
 * POST /api/v2/accounting/journal-entries/:id/reverse - Estornar lançamento
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

export const GET = withDI(async (request: NextRequest, context: RouteContext) => {
  const resolvedParams = await context.params;
  const ctx = await getTenantContext(request);
  const id = resolvedParams.id as string;

  const useCase = container.resolve(TOKENS.GetJournalEntryByIdUseCase);
  const result = await useCase.execute({
    id,
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.value);
});
