/**
 * API: War Room Team
 * Gerencia membros da equipe de uma sala de guerra
 * 
 * @module app/api/strategic/war-room/[id]/team
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { TeamMember } from '@/lib/war-room/war-room-types';
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

    return NextResponse.json({ members: warRoom.teamMembers || [] });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/war-room/[id]/team error:', error);
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

    // Check if user already in team
    if (warRoom.teamMembers.some((m) => m.userId === body.userId)) {
      return NextResponse.json({ error: 'Usuário já está na equipe' }, { status: 400 });
    }

    const newMember: TeamMember = {
      userId: body.userId,
      userName: body.userName || `Usuário ${body.userId}`,
      role: body.role || 'member',
      joinedAt: new Date(),
      isOnline: true,
    };

    warRoom.teamMembers.push(newMember);

    // Add update
    warRoom.updates.unshift({
      id: `upd-${Date.now()}`,
      type: 'member_joined',
      title: `${newMember.userName} entrou na sala`,
      userId: newMember.userId,
      userName: newMember.userName,
      timestamp: new Date(),
    });

    warRoom.updatedAt = new Date();
    setWarRoom(ctx.organizationId, warRoom);

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error adding member:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
});
