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

export const dynamic = 'force-dynamic';

// Reference the same store (in production, use database)
const webhooksStore = new Map<string, Webhook>();

export async function GET(
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

    return NextResponse.json(webhook);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/webhooks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    console.error('PATCH /api/strategic/webhooks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
    console.error('DELETE /api/strategic/webhooks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
