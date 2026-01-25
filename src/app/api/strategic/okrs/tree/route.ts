import { NextRequest, NextResponse } from 'next/server';
import type { OKR, OKRTreeNode } from '@/lib/okrs/okr-types';

// Mock data store (espelhado de ../route.ts para evitar fetch interno que falha com SSL)
const okrsStore = new Map<string, OKR>();

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
        valueHistory: [],
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
        valueHistory: [],
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
        valueHistory: [],
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

  // Team OKR
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
  // Inicializar dados mock (evita fetch interno que causa erro SSL em produção)
  initializeMockData();
  
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');

  // Usar dados do store local ao invés de fetch interno
  const okrs = Array.from(okrsStore.values());

  // Filter by period if specified
  let filteredOKRs = okrs;
  if (period) {
    filteredOKRs = okrs.filter((o) => o.periodLabel === period);
  }

  // Build tree structure
  const okrMap = new Map<string, OKRTreeNode>();

  // First pass: create tree nodes
  filteredOKRs.forEach((okr) => {
    const treeNode: OKRTreeNode = {
      ...okr,
      children: [],
      depth: 0,
      isExpanded: true,
    };
    okrMap.set(okr.id, treeNode);
  });

  // Second pass: build parent-child relationships
  const rootNodes: OKRTreeNode[] = [];

  filteredOKRs.forEach((okr) => {
    const node = okrMap.get(okr.id);
    if (!node) return;

    if (okr.parentId && okrMap.has(okr.parentId)) {
      const parent = okrMap.get(okr.parentId);
      if (parent) {
        node.depth = parent.depth + 1;
        parent.children.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  // Sort by level and progress
  const sortNodes = (nodes: OKRTreeNode[]): OKRTreeNode[] => {
    return nodes
      .sort((a, b) => b.progress - a.progress)
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }));
  };

  const tree = sortNodes(rootNodes);

  return NextResponse.json({ tree });
}
