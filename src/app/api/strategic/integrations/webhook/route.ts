/**
 * API: Webhooks Management
 *
 * GET /api/strategic/integrations/webhook - List webhooks
 * POST /api/strategic/integrations/webhook - Create webhook
 *
 * @module app/api/strategic/integrations/webhook
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Webhook } from '@/lib/integrations/integration-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// In-memory store for development
const webhooksStore = new Map<string, Webhook>();

// Initialize with mock data
if (webhooksStore.size === 0) {
  webhooksStore.set('wh-1', {
    id: 'wh-1',
    name: 'KPI Alert to External System',
    url: 'https://api.example.com/webhooks/strategic',
    method: 'POST',
    headers: {
      Authorization: 'Bearer xxx...',
      'Content-Type': 'application/json',
    },
    events: ['kpi.critical', 'kpi.updated'],
    retryPolicy: '3',
    isActive: true,
    lastTriggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    successCount: 45,
    errorCount: 2,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  webhooksStore.set('wh-2', {
    id: 'wh-2',
    name: 'Action Plan Notifications',
    url: 'https://api.example.com/webhooks/actions',
    method: 'POST',
    headers: {
      'X-API-Key': 'key-123',
    },
    events: ['action_plan.created', 'action_plan.completed', 'action_plan.overdue'],
    retryPolicy: '5',
    isActive: true,
    lastTriggeredAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    successCount: 23,
    errorCount: 0,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });
}

export const GET = withDI(async () => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhooks = Array.from(webhooksStore.values());

    return NextResponse.json({ webhooks });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/integrations/webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = `wh-${Date.now()}`;

    const webhook: Webhook = {
      id,
      name: body.name,
      url: body.url,
      method: body.method || 'POST',
      headers: body.headers || {},
      events: body.events || [],
      retryPolicy: body.retryPolicy || '3',
      secret: body.secret,
      isActive: body.isActive !== false,
      successCount: 0,
      errorCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    webhooksStore.set(id, webhook);

    return NextResponse.json(webhook);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/integrations/webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
