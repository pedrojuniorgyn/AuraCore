/**
 * API: Webhook by ID
 *
 * GET /api/strategic/webhooks/[id] - Get webhook
 * PATCH /api/strategic/webhooks/[id] - Update webhook
 * DELETE /api/strategic/webhooks/[id] - Delete webhook
 *
 * @module app/api/strategic/webhooks/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Webhook } from '@/lib/integrations/integration-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Reference the same store (in production, use database)
const webhooksStore = new Map<string, Webhook>();

export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const webhook = webhooksStore.get(id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json(webhook);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/webhooks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PATCH = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const webhook = webhooksStore.get(id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const body = await request.json();

    const updated: Webhook = {
      ...webhook,
      ...body,
      id: webhook.id,
      createdAt: webhook.createdAt,
      updatedAt: new Date(),
    };

    webhooksStore.set(id, updated);

    return NextResponse.json(updated);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('PATCH /api/strategic/webhooks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = webhooksStore.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('DELETE /api/strategic/webhooks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
