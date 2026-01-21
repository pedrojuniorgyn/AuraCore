/**
 * API: Integration Logs
 *
 * GET /api/strategic/integrations/logs - Get integration logs
 *
 * @module app/api/strategic/integrations/logs
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { IntegrationLog } from '@/lib/integrations/integration-types';

export const dynamic = 'force-dynamic';

// Mock logs for development
const mockLogs: IntegrationLog[] = [
  {
    id: 'log-1',
    integrationId: 'int-1',
    provider: 'slack',
    event: 'kpi.critical',
    status: 'success',
    destination: '#strategic-alerts',
    response: { statusCode: 200, duration: 142 },
    retryCount: 0,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'log-2',
    integrationId: 'wh-1',
    provider: 'webhook',
    event: 'kpi.updated',
    status: 'success',
    destination: 'https://api.example.com/webhooks',
    response: { statusCode: 200, duration: 98 },
    retryCount: 0,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: 'log-3',
    integrationId: 'int-2',
    provider: 'teams',
    event: 'report.generated',
    status: 'error',
    destination: 'Gestão Estratégica',
    error: 'Connection timeout',
    retryCount: 2,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'log-4',
    integrationId: 'int-3',
    provider: 'email',
    event: 'report.generated',
    status: 'success',
    destination: '5 recipients',
    response: { statusCode: 200, duration: 1250 },
    retryCount: 0,
    createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
  },
  {
    id: 'log-5',
    integrationId: 'int-1',
    provider: 'slack',
    event: 'action_plan.completed',
    status: 'success',
    destination: '#kpi-updates',
    response: { statusCode: 200, duration: 112 },
    retryCount: 0,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const integrationId = searchParams.get('integrationId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let logs = [...mockLogs];

    if (provider) {
      logs = logs.filter((l) => l.provider === provider);
    }

    if (integrationId) {
      logs = logs.filter((l) => l.integrationId === integrationId);
    }

    logs = logs.slice(0, limit);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('GET /api/strategic/integrations/logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
