/**
 * API: War Room Updates
 * Gerencia atualizações de uma sala de guerra
 * 
 * @module app/api/strategic/war-room/[id]/updates
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { WarRoomUpdate } from '@/lib/war-room/war-room-types';
import { getWarRoom, setWarRoom } from '../../_store';

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

    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');

    let updates = warRoom.updates || [];

    if (after) {
      const afterIndex = updates.findIndex((u) => u.id === after);
      if (afterIndex !== -1) {
        updates = updates.slice(0, afterIndex);
      }
    }

    return NextResponse.json({ updates });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/war-room/[id]/updates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withDI(async (
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

    const body = await request.json();

    const newUpdate: WarRoomUpdate = {
      id: `upd-${Date.now()}`,
      type: body.type,
      title: body.title,
      description: body.description,
      userId: ctx.userId,
      userName: body.userName || 'Usuário',
      timestamp: new Date(),
    };

    warRoom.updates.unshift(newUpdate);
    warRoom.updatedAt = new Date();
    setWarRoom(ctx.organizationId, warRoom);

    return NextResponse.json(newUpdate, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error adding update:', error);
    return NextResponse.json({ error: 'Failed to add update' }, { status: 500 });
  }
});
