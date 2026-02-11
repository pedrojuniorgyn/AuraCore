/**
 * API: War Rooms
 * Gerencia salas de guerra para crises e problemas críticos
 * 
 * @module app/api/strategic/war-room
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { WarRoom } from '@/lib/war-room/war-room-types';
import { getOrgStore, setWarRoom, listWarRooms } from './_store';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let warRooms = listWarRooms(ctx.organizationId);

    if (status) {
      warRooms = warRooms.filter((w) => w.status === status);
    }

    // Ordenar por severidade e data
    warRooms.sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const aSev = severityOrder[a.severity] ?? 4;
      const bSev = severityOrder[b.severity] ?? 4;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });

    // Retornar lista vazia se não houver war rooms
    // UI deve exibir empty state
    return NextResponse.json({ warRooms });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/war-room error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const body = await request.json();

    const newWarRoom: WarRoom = {
      id: `wr-${Date.now()}`,
      title: body.title,
      description: body.description || '',
      status: body.status || 'active',
      severity: body.severity || 'high',
      startedAt: new Date(),
      commanderId: ctx.userId,
      commanderName: body.commanderName || 'Comandante',
      currentEscalation: body.currentEscalation || 'N1',
      escalationHistory: [],
      linkedKpis: body.linkedKpis || [],
      linkedActionPlans: body.linkedActionPlans || [],
      teamMembers: [
        {
          userId: ctx.userId,
          userName: body.commanderName || 'Comandante',
          role: 'commander',
          joinedAt: new Date(),
          isOnline: true,
        },
      ],
      actions: [],
      updates: [
        {
          id: `upd-${Date.now()}`,
          type: 'status_change',
          title: 'War Room criada',
          description: `Motivo: ${body.description || 'Crise identificada'}`,
          timestamp: new Date(),
          userName: body.commanderName || 'Comandante',
        },
      ],
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setWarRoom(ctx.organizationId, newWarRoom);

    return NextResponse.json(newWarRoom, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error creating war room:', error);
    return NextResponse.json({ error: 'Failed to create war room' }, { status: 500 });
  }
});
