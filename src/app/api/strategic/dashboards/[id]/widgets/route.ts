import { NextRequest, NextResponse } from 'next/server';
import type { Dashboard, Widget } from '@/lib/dashboard/dashboard-types';

// Shared store
const dashboardsStore = new Map<string, Dashboard>();

// Initialize with sample data
function initializeMockData() {
  if (dashboardsStore.size > 0) return;

  const sampleDashboard: Dashboard = {
    id: 'dashboard-1',
    name: 'Dashboard Executivo',
    description: 'Visão geral dos principais KPIs e metas',
    widgets: [],
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  const dashboard = dashboardsStore.get(id);

  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  return NextResponse.json({ widgets: dashboard.widgets });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  const dashboard = dashboardsStore.get(id);

  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  try {
    const { widgets } = await request.json();

    const updated: Dashboard = {
      ...dashboard,
      widgets: widgets as Widget[],
      updatedAt: new Date(),
    };

    dashboardsStore.set(id, updated);

    return NextResponse.json({ success: true, widgets: updated.widgets });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating widgets:', error);
    return NextResponse.json({ error: 'Failed to update widgets' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  const dashboard = dashboardsStore.get(id);

  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  try {
    const widget = await request.json();

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widget.type,
      title: widget.title,
      position: widget.position,
      config: widget.config,
      isLocked: false,
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();

    dashboardsStore.set(id, dashboard);

    return NextResponse.json(newWidget, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error adding widget:', error);
    return NextResponse.json({ error: 'Failed to add widget' }, { status: 500 });
  }
}
