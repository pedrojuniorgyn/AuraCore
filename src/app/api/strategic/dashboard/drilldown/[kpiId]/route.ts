/**
 * API Routes: /api/strategic/dashboard/drilldown/[kpiId]
 * GET - Get detailed KPI data with history and action plans
 *
 * @module app/api/strategic/dashboard
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { GetDrilldownQuery } from '@/modules/strategic/application/queries/GetDrilldownQuery';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import '@/modules/strategic/infrastructure/di/StrategicModule';

/**
 * GET /api/strategic/dashboard/drilldown/{kpiId}
 * Get detailed KPI data with history and action plans
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kpiId: string }> }
) {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { kpiId } = params;

    if (!kpiId) {
      return NextResponse.json(
        { error: 'kpiId is required' },
        { status: 400 }
      );
    }

    const query = container.resolve<GetDrilldownQuery>(
      STRATEGIC_TOKENS.GetDrilldownQuery
    );

    const result = await query.getKPIDetail(
      tenantContext.organizationId,
      tenantContext.branchId,
      kpiId
    );

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Error getting KPI detail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
