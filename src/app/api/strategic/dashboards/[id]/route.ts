import { NextRequest, NextResponse } from 'next/server';
import type { Dashboard, Widget } from '@/lib/dashboard/dashboard-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
// Shared store (in real app, this would be a database)
const dashboardsStore = new Map<string, Dashboard>();

// Initialize with sample data
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

export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  initializeMockData();
  const { id } = await context.params;

  const dashboard = dashboardsStore.get(id);

  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  return NextResponse.json(dashboard);
});

export const PATCH = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  initializeMockData();
  const { id } = await context.params;

  const dashboard = dashboardsStore.get(id);

  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  try {
    const updates = await request.json();

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      dashboardsStore.forEach((d) => {
        if (d.ownerId === dashboard.ownerId && d.isDefault && d.id !== id) {
          d.isDefault = false;
        }
      });
    }

    const updated: Dashboard = {
      ...dashboard,
      ...updates,
      updatedAt: new Date(),
    };

    dashboardsStore.set(id, updated);

    return NextResponse.json(updated);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error updating dashboard:', error);
    return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
  }
});

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  initializeMockData();
  const { id } = await context.params;

  if (!dashboardsStore.has(id)) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  dashboardsStore.delete(id);

  return NextResponse.json({ success: true });
});
