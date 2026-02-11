/**
 * API: War Room Details
 * Gerencia uma sala de guerra específica
 * 
 * @module app/api/strategic/war-room/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { WarRoom } from '@/lib/war-room/war-room-types';
import { getWarRoom, setWarRoom, deleteWarRoom, hasWarRoom } from '../_store';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const ctx = await getTenantContext();
    const { id } = await context.params;

    const warRoom = getWarRoom(ctx.organizationId, id);

    if (!warRoom) {
      return NextResponse.json({ error: 'War Room não encontrada' }, { status: 404 });
    }

    return NextResponse.json(warRoom);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/war-room/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PATCH = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const ctx = await getTenantContext();
    const { id } = await context.params;

    const warRoom = getWarRoom(ctx.organizationId, id);

    if (!warRoom) {
      return NextResponse.json({ error: 'War Room não encontrada' }, { status: 404 });
    }

    const updates = await request.json();

    const updated: WarRoom = {
      ...warRoom,
      ...updates,
      updatedAt: new Date(),
    };

    setWarRoom(ctx.organizationId, updated);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error updating war room:', error);
    return NextResponse.json({ error: 'Failed to update war room' }, { status: 500 });
  }
});

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const ctx = await getTenantContext();
    const { id } = await context.params;

    if (!hasWarRoom(ctx.organizationId, id)) {
      return NextResponse.json({ error: 'War Room não encontrada' }, { status: 404 });
    }

    deleteWarRoom(ctx.organizationId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error deleting war room:', error);
    return NextResponse.json({ error: 'Failed to delete war room' }, { status: 500 });
  }
});
