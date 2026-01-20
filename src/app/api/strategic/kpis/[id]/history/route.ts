/**
 * API: GET /api/strategic/kpis/[id]/history
 * Busca histórico e estatísticas do KPI
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { GetKpiHistoryQuery } from '@/modules/strategic/application/queries/GetKpiHistoryQuery';

// GET /api/strategic/kpis/[id]/history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const query = container.resolve(GetKpiHistoryQuery);
    const result = await query.execute({ kpiId: id }, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/kpis/[id]/history error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
