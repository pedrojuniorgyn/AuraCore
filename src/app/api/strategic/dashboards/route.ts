import { NextRequest, NextResponse } from 'next/server';
import type { Dashboard, Widget } from '@/lib/dashboard/dashboard-types';

// Mock dashboards store
const dashboardsStore = new Map<string, Dashboard>();

// Initialize with sample dashboard
function initializeMockData() {
  if (dashboardsStore.size > 0) return;

  const sampleWidgets: Widget[] = [
    {
      id: 'widget-1',
      type: 'kpi_card',
      title: 'Taxa de Entrega (OTD)',
      position: { x: 0, y: 0, w: 3, h: 2 },
      config: { type: 'kpi_card', showTrend: true, showVariation: true, showTarget: true, showStatus: true },
      isLocked: false,
    },
    {
      id: 'widget-2',
      type: 'kpi_chart',
      title: 'Evolução OTD',
      position: { x: 3, y: 0, w: 6, h: 3 },
      config: { type: 'kpi_chart', chartType: 'line', period: 'month', showTrend: true },
      isLocked: false,
    },
    {
      id: 'widget-3',
      type: 'leaderboard',
      title: 'Ranking',
      position: { x: 9, y: 0, w: 3, h: 4 },
      config: { type: 'leaderboard', period: 'month', limit: 5, showCurrentUser: true },
      isLocked: false,
    },
    {
      id: 'widget-4',
      type: 'goal_bars',
      title: 'Metas por Trimestre',
      position: { x: 0, y: 2, w: 6, h: 3 },
      config: { type: 'goal_bars', showPercentage: true, showValue: true },
      isLocked: false,
    },
    {
      id: 'widget-5',
      type: 'streak',
      title: 'Minha Sequência',
      position: { x: 6, y: 3, w: 3, h: 2 },
      config: { type: 'streak', showRecord: true, showCalendar: false },
      isLocked: false,
    },
  ];

  const sampleDashboard: Dashboard = {
    id: 'dashboard-1',
    name: 'Dashboard Executivo',
    description: 'Visão geral dos principais KPIs e metas',
    widgets: sampleWidgets,
    ownerId: 'current-user',
    ownerName: 'Você',
    visibility: 'private',
    isDefault: true,
    organizationId: 1,
    branchId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  dashboardsStore.set(sampleDashboard.id, sampleDashboard);
}

export async function GET(request: NextRequest) {
  initializeMockData();

  const { searchParams } = new URL(request.url);
  const visibility = searchParams.get('visibility');
  const ownerId = searchParams.get('ownerId');
  const search = searchParams.get('search');

  let dashboards = Array.from(dashboardsStore.values());

  // Apply filters
  if (visibility) {
    dashboards = dashboards.filter((d) => d.visibility === visibility);
  }

  if (ownerId) {
    dashboards = dashboards.filter((d) => d.ownerId === ownerId);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    dashboards = dashboards.filter(
      (d) =>
        d.name.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower)
    );
  }

  return NextResponse.json({ dashboards });
}

export async function POST(request: NextRequest) {
  initializeMockData();

  try {
    const body = await request.json();

    const newDashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      name: body.name,
      description: body.description,
      widgets: body.widgets || [],
      ownerId: body.ownerId || 'current-user',
      ownerName: body.ownerName || 'Você',
      visibility: body.visibility || 'private',
      isDefault: body.isDefault || false,
      organizationId: body.organizationId || 1,
      branchId: body.branchId || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If this is set as default, unset other defaults
    if (newDashboard.isDefault) {
      dashboardsStore.forEach((d) => {
        if (d.ownerId === newDashboard.ownerId && d.isDefault) {
          d.isDefault = false;
        }
      });
    }

    dashboardsStore.set(newDashboard.id, newDashboard);

    return NextResponse.json(newDashboard, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
  }
}
