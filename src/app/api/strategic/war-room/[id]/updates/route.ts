import { NextRequest, NextResponse } from 'next/server';
import type { WarRoom, WarRoomUpdate } from '@/lib/war-room/war-room-types';

// Shared mock store
const warRoomsStore = new Map<string, WarRoom>();

function initializeMockData() {
  if (warRoomsStore.size > 0) return;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const mockWarRoom: WarRoom = {
    id: 'wr-1',
    title: 'Crise OTD Região Sul',
    description: 'OTD caiu para 78%',
    status: 'active',
    severity: 'critical',
    startedAt: threeDaysAgo,
    commanderId: 'user-1',
    commanderName: 'João Silva',
    currentEscalation: 'N3',
    escalationHistory: [],
    linkedKpis: [],
    linkedActionPlans: [],
    teamMembers: [],
    actions: [],
    updates: [
      { id: 'upd-1', type: 'kpi_update', title: 'KPI OTD atualizado: 78% → 79%', timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), userName: 'Sistema' },
      { id: 'upd-2', type: 'action_completed', title: 'Ação concluída: Contratar transportadora backup', timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), userName: 'Maria Santos' },
    ],
    organizationId: 1,
    branchId: 1,
    createdAt: threeDaysAgo,
    updatedAt: now,
  };

  warRoomsStore.set(mockWarRoom.id, mockWarRoom);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  const warRoom = warRoomsStore.get(id);

  if (!warRoom) {
    return NextResponse.json({ error: 'War Room not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get('after');

  let updates = warRoom.updates;

  if (after) {
    const afterIndex = updates.findIndex((u) => u.id === after);
    if (afterIndex !== -1) {
      updates = updates.slice(0, afterIndex);
    }
  }

  return NextResponse.json({ updates });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  const warRoom = warRoomsStore.get(id);

  if (!warRoom) {
    return NextResponse.json({ error: 'War Room not found' }, { status: 404 });
  }

  try {
    const body = await request.json();

    const newUpdate: WarRoomUpdate = {
      id: `upd-${Date.now()}`,
      type: body.type,
      title: body.title,
      description: body.description,
      userId: 'current-user',
      userName: 'Você',
      timestamp: new Date(),
    };

    warRoom.updates.unshift(newUpdate);
    warRoom.updatedAt = new Date();
    warRoomsStore.set(id, warRoom);

    return NextResponse.json(newUpdate, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error adding update:', error);
    return NextResponse.json({ error: 'Failed to add update' }, { status: 500 });
  }
}
