/**
 * API: War Room Actions
 * Gerencia ações de uma sala de guerra
 * 
 * @module app/api/strategic/war-room/[id]/actions
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { WarRoomAction } from '@/lib/war-room/war-room-types';
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

    return NextResponse.json({ actions: warRoom.actions || [] });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/war-room/[id]/actions error:', error);
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

    const newAction: WarRoomAction = {
      id: `action-${Date.now()}`,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId || ctx.userId,
      assigneeName: body.assigneeName || 'Responsável',
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      createdAt: new Date(),
      createdBy: ctx.userId,
    };

    warRoom.actions.push(newAction);

    // Add update
    warRoom.updates.unshift({
      id: `upd-${Date.now()}`,
      type: 'action_created',
      title: `Ação criada: ${newAction.title}`,
      userId: ctx.userId,
      userName: body.assigneeName || 'Responsável',
      timestamp: new Date(),
    });

    warRoom.updatedAt = new Date();
    setWarRoom(ctx.organizationId, warRoom);

    return NextResponse.json(newAction, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error creating action:', error);
    return NextResponse.json({ error: 'Failed to create action' }, { status: 500 });
  }
});
