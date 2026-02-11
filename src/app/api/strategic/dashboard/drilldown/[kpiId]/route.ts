/**
 * API Routes: /api/strategic/dashboard/drilldown/[kpiId]
 * GET - Get detailed KPI data with history and action plans
 *
 * @module app/api/strategic/dashboard
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { GetDrilldownQuery } from '@/modules/strategic/application/queries/GetDrilldownQuery';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
/**
 * GET /api/strategic/dashboard/drilldown/{kpiId}?months=12
 * Get detailed KPI data with history and action plans
 * 
 * @param kpiId - KPI UUID
 * @param months - Number of months of history to return (default: 12, range: 1-36)
 */
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const kpiId = (params as Record<string, string>).kpiId;

    if (!kpiId) {
      return NextResponse.json(
        { error: 'kpiId is required' },
        { status: 400 }
      );
    }

    // Extract 'months' query parameter (default: 12)
    const { searchParams } = new URL(request.url);
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 12;

    // Validate months parameter
    if (isNaN(months) || months < 1 || months > 36) {
      return NextResponse.json(
        { error: 'months must be between 1 and 36' },
        { status: 400 }
      );
    }

    const query = container.resolve<GetDrilldownQuery>(
      STRATEGIC_TOKENS.GetDrilldownQuery
    );

    const result = await query.getKPIDetail(
      tenantContext.organizationId,
      tenantContext.branchId,
      kpiId,
      months
    );

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    logger.error('Error getting KPI detail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
