import { NextRequest, NextResponse } from 'next/server';
import type { OKR } from '@/lib/okrs/okr-types';

// Mock data store
const okrsStore = new Map<string, OKR>();

// Initialize with sample data
function initializeMockData() {
  if (okrsStore.size > 0) return;

  const now = new Date();
  const startQ1 = new Date('2026-01-01');
  const endQ1 = new Date('2026-03-31');

  // Corporate OKR
  const corporateOKR: OKR = {
    id: 'okr-corporate-1',
    title: 'Aumentar eficiência operacional em 20%',
    description: 'Objetivo estratégico principal para Q1 2026',
    level: 'corporate',
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'user-ceo',
    ownerName: 'CEO',
    ownerType: 'user',
    keyResults: [
      {
        id: 'kr-1',
        okrId: 'okr-corporate-1',
        title: 'Reduzir custo por entrega em 15%',
        metricType: 'currency',
        startValue: 8.5,
        targetValue: 7.23,
        currentValue: 7.65,
        progress: 70,
        status: 'on_track',
        weight: 40,
        valueHistory: [
          { value: 8.5, progress: 0, timestamp: startQ1, updatedBy: 'Sistema' },
          { value: 8.0, progress: 39, timestamp: new Date('2026-01-15'), updatedBy: 'João Silva' },
          { value: 7.65, progress: 70, timestamp: new Date('2026-01-20'), updatedBy: 'Maria Santos' },
        ],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
      {
        id: 'kr-2',
        okrId: 'okr-corporate-1',
        title: 'Aumentar OTD para 95%',
        metricType: 'percentage',
        startValue: 88,
        targetValue: 95,
        currentValue: 92,
        progress: 55,
        status: 'at_risk',
        linkedKpiId: 'kpi-cli-001',
        linkedKpiName: 'Taxa de Entrega',
        weight: 35,
        valueHistory: [
          { value: 88, progress: 0, timestamp: startQ1, updatedBy: 'Sistema' },
          { value: 90, progress: 29, timestamp: new Date('2026-01-10'), updatedBy: 'Sistema' },
          { value: 92, progress: 55, timestamp: new Date('2026-01-18'), updatedBy: 'Sistema' },
        ],
        order: 2,
        createdAt: startQ1,
        updatedAt: now,
      },
      {
        id: 'kr-3',
        okrId: 'okr-corporate-1',
        title: 'Reduzir devoluções para < 2%',
        metricType: 'percentage',
        startValue: 5,
        targetValue: 2,
        currentValue: 2.5,
        progress: 80,
        status: 'on_track',
        weight: 25,
        valueHistory: [
          { value: 5, progress: 0, timestamp: startQ1, updatedBy: 'Sistema' },
          { value: 3.5, progress: 50, timestamp: new Date('2026-01-12'), updatedBy: 'Pedro Alves' },
          { value: 2.5, progress: 80, timestamp: new Date('2026-01-19'), updatedBy: 'Pedro Alves' },
        ],
        order: 3,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 65,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-ceo',
  };

  // Department OKRs
  const logisticsOKR: OKR = {
    id: 'okr-dept-logistics',
    title: 'Otimizar rotas de entrega',
    description: 'Melhorar eficiência das rotas para reduzir custos e tempo',
    level: 'department',
    parentId: 'okr-corporate-1',
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'dept-logistics',
    ownerName: 'Logística',
    ownerType: 'department',
    keyResults: [
      {
        id: 'kr-log-1',
        okrId: 'okr-dept-logistics',
        title: 'Implementar roteirização automática',
        metricType: 'percentage',
        startValue: 0,
        targetValue: 100,
        currentValue: 75,
        progress: 75,
        status: 'on_track',
        weight: 50,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
      {
        id: 'kr-log-2',
        okrId: 'okr-dept-logistics',
        title: 'Reduzir km rodados em 10%',
        metricType: 'percentage',
        startValue: 0,
        targetValue: 10,
        currentValue: 7.5,
        progress: 75,
        status: 'on_track',
        weight: 50,
        valueHistory: [],
        order: 2,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 75,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-logistics-mgr',
  };

  const financeOKR: OKR = {
    id: 'okr-dept-finance',
    title: 'Reduzir custos operacionais',
    level: 'department',
    parentId: 'okr-corporate-1',
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'dept-finance',
    ownerName: 'Financeiro',
    ownerType: 'department',
    keyResults: [
      {
        id: 'kr-fin-1',
        okrId: 'okr-dept-finance',
        title: 'Renegociar contratos com fornecedores',
        metricType: 'percentage',
        startValue: 0,
        targetValue: 100,
        currentValue: 60,
        progress: 60,
        status: 'at_risk',
        weight: 100,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 60,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-finance-mgr',
  };

  const commercialOKR: OKR = {
    id: 'okr-dept-commercial',
    title: 'Aumentar vendas em 15%',
    level: 'department',
    parentId: 'okr-corporate-1',
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'dept-commercial',
    ownerName: 'Comercial',
    ownerType: 'department',
    keyResults: [
      {
        id: 'kr-com-1',
        okrId: 'okr-dept-commercial',
        title: 'Conquistar 50 novos clientes',
        metricType: 'number',
        startValue: 0,
        targetValue: 50,
        currentValue: 35,
        progress: 70,
        status: 'on_track',
        weight: 100,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 70,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-commercial-mgr',
  };

  // Team OKRs
  const teamNorthOKR: OKR = {
    id: 'okr-team-north',
    title: 'Melhorar OTD Região Norte',
    level: 'team',
    parentId: 'okr-dept-logistics',
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'team-north',
    ownerName: 'Equipe Norte',
    ownerType: 'team',
    keyResults: [
      {
        id: 'kr-north-1',
        okrId: 'okr-team-north',
        title: 'OTD Região Norte > 96%',
        metricType: 'percentage',
        startValue: 85,
        targetValue: 96,
        currentValue: 93,
        progress: 72,
        status: 'on_track',
        weight: 100,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 72,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-north-lead',
  };

  okrsStore.set(corporateOKR.id, corporateOKR);
  okrsStore.set(logisticsOKR.id, logisticsOKR);
  okrsStore.set(financeOKR.id, financeOKR);
  okrsStore.set(commercialOKR.id, commercialOKR);
  okrsStore.set(teamNorthOKR.id, teamNorthOKR);
}

export async function GET(request: NextRequest) {
  initializeMockData();

  const { searchParams } = new URL(request.url);
  const level = searchParams.getAll('level');
  const status = searchParams.getAll('status');
  const ownerId = searchParams.get('ownerId');
  const parentId = searchParams.get('parentId');
  const search = searchParams.get('search');

  let okrs = Array.from(okrsStore.values());

  // Apply filters
  if (level.length > 0) {
    okrs = okrs.filter((o) => level.includes(o.level));
  }
  if (status.length > 0) {
    okrs = okrs.filter((o) => status.includes(o.status));
  }
  if (ownerId) {
    okrs = okrs.filter((o) => o.ownerId === ownerId);
  }
  if (parentId !== null) {
    if (parentId === 'null') {
      okrs = okrs.filter((o) => !o.parentId);
    } else {
      okrs = okrs.filter((o) => o.parentId === parentId);
    }
  }
  if (search) {
    const searchLower = search.toLowerCase();
    okrs = okrs.filter(
      (o) =>
        o.title.toLowerCase().includes(searchLower) ||
        o.description?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by level priority then title
  const levelOrder = { corporate: 0, department: 1, team: 2, individual: 3 };
  okrs.sort((a, b) => {
    const levelDiff = levelOrder[a.level] - levelOrder[b.level];
    if (levelDiff !== 0) return levelDiff;
    return a.title.localeCompare(b.title);
  });

  return NextResponse.json({ okrs });
}

export async function POST(request: NextRequest) {
  initializeMockData();

  try {
    const body = await request.json();

    const newOKR: OKR = {
      id: `okr-${Date.now()}`,
      title: body.title,
      description: body.description,
      level: body.level || 'department',
      parentId: body.parentId,
      periodType: body.periodType || 'quarter',
      periodLabel: body.periodLabel || 'Q1 2026',
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : new Date(),
      ownerId: body.ownerId,
      ownerName: body.ownerName,
      ownerType: body.ownerType || 'user',
      keyResults: [],
      progress: 0,
      status: body.status || 'draft',
      organizationId: body.organizationId || 1,
      branchId: body.branchId || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: body.createdBy || 'user-unknown',
    };

    okrsStore.set(newOKR.id, newOKR);

    return NextResponse.json(newOKR, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating OKR:', error);
    return NextResponse.json({ error: 'Failed to create OKR' }, { status: 500 });
  }
}
