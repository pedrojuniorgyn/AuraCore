import { NextRequest, NextResponse } from 'next/server';
import type { WarRoom } from '@/lib/war-room/war-room-types';

// Mock store
const warRoomsStore = new Map<string, WarRoom>();

function initializeMockData() {
  if (warRoomsStore.size > 0) return;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const mockWarRoom1: WarRoom = {
    id: 'wr-1',
    title: 'Crise OTD Região Sul',
    description: 'OTD caiu para 78% - abaixo do limite crítico (85%)',
    status: 'active',
    severity: 'critical',
    startedAt: threeDaysAgo,
    commanderId: 'user-1',
    commanderName: 'João Silva',
    currentEscalation: 'N3',
    escalationHistory: [
      { fromLevel: 'N1', toLevel: 'N2', reason: 'Sem resolução em 4h', escalatedBy: 'Sistema', escalatedAt: new Date(threeDaysAgo.getTime() + 4 * 60 * 60 * 1000) },
      { fromLevel: 'N2', toLevel: 'N3', reason: 'Sem resolução em 8h', escalatedBy: 'Sistema', escalatedAt: new Date(threeDaysAgo.getTime() + 12 * 60 * 60 * 1000) },
    ],
    nextEscalationAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    linkedKpis: [
      { kpiId: 'kpi-1', kpiName: 'OTD Região Sul', kpiCode: 'OTD-SUL', currentValue: 78, targetValue: 95, threshold: 85, status: 'critical' },
      { kpiId: 'kpi-2', kpiName: 'Custo Extra Frete', kpiCode: 'CEF', currentValue: 145, targetValue: 100, threshold: 120, status: 'warning' },
    ],
    linkedActionPlans: [],
    teamMembers: [
      { userId: 'user-1', userName: 'João Silva', role: 'commander', joinedAt: threeDaysAgo, isOnline: true },
      { userId: 'user-2', userName: 'Maria Santos', role: 'member', joinedAt: threeDaysAgo, isOnline: true },
      { userId: 'user-3', userName: 'Pedro Alves', role: 'member', joinedAt: new Date(threeDaysAgo.getTime() + 24 * 60 * 60 * 1000), isOnline: false, lastSeenAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
    ],
    actions: [
      { id: 'action-1', title: 'Contratar 2 motoristas extras', assigneeId: 'user-3', assigneeName: 'Pedro Alves', status: 'in_progress', priority: 'urgent', dueDate: now, createdAt: threeDaysAgo, createdBy: 'user-1' },
      { id: 'action-2', title: 'Renegociar prazos com clientes afetados', assigneeId: 'user-2', assigneeName: 'Maria Santos', status: 'pending', priority: 'high', dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), createdAt: new Date(threeDaysAgo.getTime() + 24 * 60 * 60 * 1000), createdBy: 'user-1' },
    ],
    updates: [
      { id: 'upd-1', type: 'kpi_update', title: 'KPI OTD atualizado: 78% → 79%', timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), userName: 'Sistema' },
      { id: 'upd-2', type: 'action_completed', title: 'Ação concluída: Contratar transportadora backup', timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), userName: 'Maria Santos' },
      { id: 'upd-3', type: 'member_joined', title: 'Pedro Alves entrou na sala', timestamp: new Date(threeDaysAgo.getTime() + 24 * 60 * 60 * 1000) },
      { id: 'upd-4', type: 'escalation', title: 'Escalação para N3 (Gerente Regional)', timestamp: new Date(threeDaysAgo.getTime() + 12 * 60 * 60 * 1000), userName: 'Sistema' },
    ],
    organizationId: 1,
    branchId: 1,
    createdAt: threeDaysAgo,
    updatedAt: now,
  };

  const mockWarRoom2: WarRoom = {
    id: 'wr-2',
    title: 'Aumento de Devoluções',
    description: 'Taxa de devolução subiu 40% no último mês',
    status: 'active',
    severity: 'high',
    startedAt: oneWeekAgo,
    commanderId: 'user-4',
    commanderName: 'Ana Costa',
    currentEscalation: 'N2',
    escalationHistory: [
      { fromLevel: 'N1', toLevel: 'N2', reason: 'Problema persiste', escalatedBy: 'user-4', escalatedAt: new Date(oneWeekAgo.getTime() + 24 * 60 * 60 * 1000) },
    ],
    linkedKpis: [
      { kpiId: 'kpi-3', kpiName: 'Taxa de Devolução', kpiCode: 'DEV', currentValue: 8.5, targetValue: 5, threshold: 7, status: 'critical' },
    ],
    linkedActionPlans: [],
    teamMembers: [
      { userId: 'user-4', userName: 'Ana Costa', role: 'commander', joinedAt: oneWeekAgo, isOnline: true },
      { userId: 'user-5', userName: 'Carlos Lima', role: 'member', joinedAt: oneWeekAgo, isOnline: true },
    ],
    actions: [
      { id: 'action-3', title: 'Analisar causas raiz das devoluções', assigneeId: 'user-5', assigneeName: 'Carlos Lima', status: 'in_progress', priority: 'high', createdAt: oneWeekAgo, createdBy: 'user-4' },
    ],
    updates: [
      { id: 'upd-5', type: 'action_created', title: 'Ação criada: Analisar causas raiz', timestamp: oneWeekAgo, userName: 'Ana Costa' },
    ],
    organizationId: 1,
    branchId: 1,
    createdAt: oneWeekAgo,
    updatedAt: now,
  };

  warRoomsStore.set(mockWarRoom1.id, mockWarRoom1);
  warRoomsStore.set(mockWarRoom2.id, mockWarRoom2);
}

export async function GET(request: NextRequest) {
  initializeMockData();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let warRooms = Array.from(warRoomsStore.values());

  if (status) {
    warRooms = warRooms.filter((w) => w.status === status);
  }

  // Sort by severity and startedAt
  warRooms.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aSev = severityOrder[a.severity];
    const bSev = severityOrder[b.severity];
    if (aSev !== bSev) return aSev - bSev;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  return NextResponse.json({ warRooms });
}

export async function POST(request: NextRequest) {
  initializeMockData();

  try {
    const body = await request.json();

    const newWarRoom: WarRoom = {
      id: `wr-${Date.now()}`,
      title: body.title,
      description: body.description || '',
      status: body.status || 'active',
      severity: body.severity || 'high',
      startedAt: new Date(),
      commanderId: body.commanderId || 'current-user',
      commanderName: body.commanderName || 'Você',
      currentEscalation: body.currentEscalation || 'N1',
      escalationHistory: [],
      linkedKpis: body.linkedKpis || [],
      linkedActionPlans: body.linkedActionPlans || [],
      teamMembers: body.teamMembers || [],
      actions: body.actions || [],
      updates: [
        {
          id: `upd-${Date.now()}`,
          type: 'status_change',
          title: 'War Room criada',
          description: `Motivo: ${body.description}`,
          timestamp: new Date(),
        },
      ],
      organizationId: body.organizationId || 1,
      branchId: body.branchId || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    warRoomsStore.set(newWarRoom.id, newWarRoom);

    return NextResponse.json(newWarRoom, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating war room:', error);
    return NextResponse.json({ error: 'Failed to create war room' }, { status: 500 });
  }
}
