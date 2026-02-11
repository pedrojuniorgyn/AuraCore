/**
 * API: GET /api/strategic/kpis/[id]/history
 * Busca histórico e estatísticas do KPI
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { GetKpiHistoryQuery } from '@/modules/strategic/application/queries/GetKpiHistoryQuery';
import { z } from 'zod';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
const idSchema = z.string().trim().uuid('Invalid kpi id');

// GET /api/strategic/kpis/[id]/history
export const GET = withDI(async (
  request: Request,
  routeCtx: RouteContext
) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await routeCtx.params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid kpi id' }, { status: 400 });
    }

    const query = container.resolve(GetKpiHistoryQuery);
    const result = await query.execute({ kpiId: idResult.data }, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('GET /api/strategic/kpis/[id]/history error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
