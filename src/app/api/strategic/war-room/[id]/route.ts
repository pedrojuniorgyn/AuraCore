import { NextRequest, NextResponse } from 'next/server';
import type { WarRoom } from '@/lib/war-room/war-room-types';

// Shared mock store
const warRoomsStore = new Map<string, WarRoom>();

function initializeMockData() {
  if (warRoomsStore.size > 0) return;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const mockWarRoom: WarRoom = {
    id: 'wr-1',
    title: 'Crise OTD Região Sul',
    description: 'OTD caiu para 78% - abaixo do limite crítico (85%)',
    status: 'active',
    severity: 'critical',
    startedAt: threeDaysAgo,
    commanderId: 'user-1',
    commanderName: 'João Silva',
    currentEscalation: 'N3',
    escalationHistory: [],
    linkedKpis: [
      { kpiId: 'kpi-1', kpiName: 'OTD Região Sul', kpiCode: 'OTD-SUL', currentValue: 78, targetValue: 95, threshold: 85, status: 'critical' },
    ],
    linkedActionPlans: [],
    teamMembers: [
      { userId: 'user-1', userName: 'João Silva', role: 'commander', joinedAt: threeDaysAgo, isOnline: true },
    ],
    actions: [],
    updates: [],
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

  return NextResponse.json(warRoom);
}

export async function PATCH(
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
    const updates = await request.json();

    const updated: WarRoom = {
      ...warRoom,
      ...updates,
      updatedAt: new Date(),
    };

    warRoomsStore.set(id, updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating war room:', error);
    return NextResponse.json({ error: 'Failed to update war room' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  if (!warRoomsStore.has(id)) {
    return NextResponse.json({ error: 'War Room not found' }, { status: 404 });
  }

  warRoomsStore.delete(id);

  return NextResponse.json({ success: true });
}
