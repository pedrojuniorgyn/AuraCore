/**
 * API Routes: /api/strategic/dashboard/drilldown
 * GET - Drill-down navigation for BSC dashboard
 *
 * @module app/api/strategic/dashboard
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { GetDrilldownQuery } from '@/modules/strategic/application/queries/GetDrilldownQuery';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';

const drilldownSchema = z.object({
  level: z.enum(['perspective', 'goal', 'kpi'], { message: 'Invalid level' }),
  strategyId: z.string().trim().min(1, { message: 'strategyId is required' }),
  parentId: z.string().trim().optional(),
});

/**
 * GET /api/strategic/dashboard/drilldown
 * Get drill-down data for dashboard navigation
 */
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      level: searchParams.get('level'),
      strategyId: searchParams.get('strategyId'),
      parentId: searchParams.get('parentId') || undefined,
    };

    const parsed = drilldownSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const query = container.resolve<GetDrilldownQuery>(
      STRATEGIC_TOKENS.GetDrilldownQuery
    );

    let result: unknown;
    switch (parsed.data.level) {
      case 'perspective':
        result = await query.getPerspectives({
          organizationId: context.organizationId,
          branchId: context.branchId,
          level: 'perspective',
          strategyId: parsed.data.strategyId,
        });
        break;
      case 'goal':
        result = await query.getGoals({
          organizationId: context.organizationId,
          branchId: context.branchId,
          level: 'goal',
          strategyId: parsed.data.strategyId,
          parentId: parsed.data.parentId,
        });
        break;
      case 'kpi':
        result = await query.getKPIs({
          organizationId: context.organizationId,
          branchId: context.branchId,
          level: 'kpi',
          strategyId: parsed.data.strategyId,
          parentId: parsed.data.parentId,
        });
        break;
    }

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      level: parsed.data.level,
      parentId: parsed.data.parentId,
      data: result.value,
    });
  } catch (error) {
    console.error('Error in drilldown:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
