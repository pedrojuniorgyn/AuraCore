import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory store for development (replace with database in production)
const integrationsStore = new Map<string, Record<string, unknown>>();

// Initialize with mock data
if (integrationsStore.size === 0) {
  integrationsStore.set('int-1', {
    id: 'int-1',
    type: 'slack',
    name: 'Slack',
    config: {
      webhookUrl: 'https://hooks.slack.com/services/...',
      channel: '#estrategia',
      events: ['kpi.critical', 'achievement.unlocked'],
      messageFormat: 'detailed',
    },
    isActive: true,
    lastSyncAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    stats: { totalSent: 156, successRate: 98.5 },
    logs: [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        method: 'POST',
        status: 200,
        duration: 142,
        event: 'kpi.critical',
        description: 'KPI OTD abaixo da meta',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        method: 'POST',
        status: 200,
        duration: 98,
        event: 'achievement.unlocked',
        description: 'Badge "Estrategista"',
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        method: 'POST',
        status: 500,
        duration: 2341,
        event: 'report.generated',
        description: 'Relatório Semanal',
        error: 'Rate limit exceeded',
      },
    ],
  });
  
  integrationsStore.set('int-2', {
    id: 'int-2',
    type: 'teams',
    name: 'Microsoft Teams',
    config: {
      webhookUrl: 'https://outlook.office.com/webhook/...',
      channel: 'Gestão Estratégica',
      events: ['report.generated'],
      messageFormat: 'rich',
    },
    isActive: true,
    lastSyncAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    stats: { totalSent: 24, successRate: 100 },
    logs: [],
  });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrations = Array.from(integrationsStore.values());

    return NextResponse.json({ integrations });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching integrations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await request.json();
    
    // TODO: Save integration to database
    const id = `int-${Date.now()}`;
    
    const newIntegration = {
      id,
      type: config.type,
      name: config.name,
      config: {
        webhookUrl: config.webhookUrl,
        channel: config.channel,
        events: config.events,
        messageFormat: config.messageFormat,
      },
      isActive: true,
      lastSyncAt: null,
      stats: { totalSent: 0, successRate: 100 },
      logs: [],
    };

    integrationsStore.set(id, newIntegration);

    console.log('Integration created:', id);

    return NextResponse.json({ success: true, id, integration: newIntegration });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
