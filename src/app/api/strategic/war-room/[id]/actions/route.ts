import { NextRequest, NextResponse } from 'next/server';
import type { WarRoom, WarRoomAction } from '@/lib/war-room/war-room-types';

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
    actions: [
      { id: 'action-1', title: 'Contratar motoristas extras', assigneeId: 'user-3', assigneeName: 'Pedro Alves', status: 'in_progress', priority: 'urgent', dueDate: now, createdAt: threeDaysAgo, createdBy: 'user-1' },
    ],
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

  return NextResponse.json({ actions: warRoom.actions });
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

    const newAction: WarRoomAction = {
      id: `action-${Date.now()}`,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId || 'current-user',
      assigneeName: body.assigneeName || 'Você',
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      createdAt: new Date(),
      createdBy: 'current-user',
    };

    warRoom.actions.push(newAction);

    // Add update
    warRoom.updates.unshift({
      id: `upd-${Date.now()}`,
      type: 'action_created',
      title: `Ação criada: ${newAction.title}`,
      userId: 'current-user',
      userName: 'Você',
      timestamp: new Date(),
    });

    warRoom.updatedAt = new Date();
    warRoomsStore.set(id, warRoom);

    return NextResponse.json(newAction, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating action:', error);
    return NextResponse.json({ error: 'Failed to create action' }, { status: 500 });
  }
}
