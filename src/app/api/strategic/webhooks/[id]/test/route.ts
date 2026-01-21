/**
 * API: Test Webhook
 *
 * POST /api/strategic/webhooks/[id]/test - Test webhook
 *
 * @module app/api/strategic/webhooks/[id]/test
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Webhook, IntegrationPayload, IntegrationEventType } from '@/lib/integrations/integration-types';

export const dynamic = 'force-dynamic';

// Reference the same store (in production, use database)
const webhooksStore = new Map<string, Webhook>();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const webhook = webhooksStore.get(id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Generate test payload
    const testEvent = webhook.events[0] || 'kpi.critical';
    const payload: IntegrationPayload = {
      event: testEvent,
      timestamp: new Date().toISOString(),
      organizationId: 1,
      data: {
        test: true,
        message: 'This is a test webhook from AuraCore',
        kpiId: 'test-kpi',
        kpiName: 'Test KPI',
        value: 95,
      },
      metadata: {
        triggeredBy: 'test',
        url: 'https://app.auracore.com/strategic/integrations/webhook',
      },
    };

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return NextResponse.json({
          success: true,
          statusCode: response.status,
        });
      } else {
        return NextResponse.json({
          success: false,
          statusCode: response.status,
          error: `${response.status} ${response.statusText}`,
        });
      }
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Failed to connect',
      });
    }
  } catch (error) {
    console.error('POST /api/strategic/webhooks/[id]/test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
