/**
 * API: GET /api/strategic/analytics
 * Retorna dados agregados de analytics
 *
 * @module app/api/strategic/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateMockAnalyticsData } from '@/lib/analytics/metrics-calculator';
import type { TimeRangeKey } from '@/lib/analytics/analytics-types';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { organizationId } = session.user;
  const searchParams = request.nextUrl.searchParams;
  const timeRange = (searchParams.get('timeRange') || '30d') as TimeRangeKey;

  try {
    // TODO: Em produção, buscar dados reais do banco
    // const data = await fetchAnalyticsData(organizationId, timeRange);

    // Por enquanto, usar dados mock
    const data = generateMockAnalyticsData(timeRange, organizationId);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
