import { NextRequest, NextResponse } from 'next/server';
import type { WarRoom, TeamMember } from '@/lib/war-room/war-room-types';

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

  return NextResponse.json({ members: warRoom.teamMembers });
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

    // Check if user already in team
    if (warRoom.teamMembers.some((m) => m.userId === body.userId)) {
      return NextResponse.json({ error: 'User already in team' }, { status: 400 });
    }

    const newMember: TeamMember = {
      userId: body.userId,
      userName: body.userName || `User ${body.userId}`,
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
    warRoomsStore.set(id, warRoom);

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
