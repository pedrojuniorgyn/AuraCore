/**
 * API: Strategic Audit Logs
 *
 * GET /api/strategic/audit - List audit logs
 * POST /api/strategic/audit - Create audit log
 *
 * @module app/api/strategic/audit
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { AuditLog, AuditEntityType, AuditAction, AuditChange } from '@/lib/audit/audit-types';

export const dynamic = 'force-dynamic';

// In-memory store for development
const auditLogsStore: AuditLog[] = [];

// Initialize with mock data
if (auditLogsStore.length === 0) {
  const mockLogs: Partial<AuditLog>[] = [
    {
      entityType: 'kpi',
      entityId: 'kpi-1',
      entityName: 'Taxa OTD',
      action: 'update',
      userName: 'João Silva',
      userEmail: 'joao@empresa.com',
      changes: [
        { field: 'currentValue', previousValue: 89, newValue: 92, changeType: 'modified' },
      ],
      reason: 'Atualização mensal com dados de dezembro',
    },
    {
      entityType: 'action_plan',
      entityId: 'plan-1',
      entityName: 'Otimizar rotas região Norte',
      action: 'create',
      userName: 'Maria Santos',
      userEmail: 'maria@empresa.com',
    },
    {
      entityType: 'pdca_cycle',
      entityId: 'pdca-1',
      entityName: 'Melhoria Contínua Q1',
      action: 'update',
      userName: 'Pedro Alves',
      userEmail: 'pedro@empresa.com',
      changes: [{ field: 'phase', previousValue: 'Plan', newValue: 'Do', changeType: 'modified' }],
    },
    {
      entityType: 'kpi',
      entityId: 'kpi-2',
      entityName: 'Métrica Legada',
      action: 'delete',
      userName: 'Ana Costa',
      userEmail: 'ana@empresa.com',
    },
    {
      entityType: 'report',
      entityId: 'report-1',
      entityName: 'Relatório Semanal KPIs',
      action: 'export',
      userName: 'Sistema',
      userEmail: 'sistema@auracore.com',
    },
    {
      entityType: 'role',
      entityId: 'role-2',
      entityName: 'Executor de Planos',
      action: 'permission_change',
      userName: 'João Silva',
      userEmail: 'joao@empresa.com',
      changes: [
        { field: 'permissions', previousValue: 12, newValue: 14, changeType: 'modified' },
      ],
    },
  ];

  mockLogs.forEach((log, i) => {
    const hoursAgo = i * 2;
    auditLogsStore.push({
      id: `log-${i + 1}`,
      organizationId: 1,
      branchId: 1,
      userId: `user-${(i % 4) + 1}`,
      userName: log.userName || 'Usuário',
      userEmail: log.userEmail || 'user@empresa.com',
      entityType: log.entityType || 'kpi',
      entityId: log.entityId || `entity-${i}`,
      entityName: log.entityName || 'Entidade',
      action: log.action || 'view',
      changes: log.changes,
      reason: log.reason,
      createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const entityType = searchParams.get('entityType') as AuditEntityType | null;
    const action = searchParams.get('action') as AuditAction | null;
    const userId = searchParams.get('userId');
    const searchQuery = searchParams.get('q');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let filtered = [...auditLogsStore];

    // Apply filters
    if (entityType) {
      filtered = filtered.filter((l) => l.entityType === entityType);
    }
    if (action) {
      filtered = filtered.filter((l) => l.action === action);
    }
    if (userId) {
      filtered = filtered.filter((l) => l.userId === userId);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.entityName.toLowerCase().includes(query) ||
          l.userName.toLowerCase().includes(query)
      );
    }
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((l) => new Date(l.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((l) => new Date(l.createdAt) <= end);
    }

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const logs = filtered.slice(start, start + pageSize);
    const hasMore = start + logs.length < total;

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      hasMore,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      organizationId: 1,
      branchId: 1,
      userId: session.user.id || 'unknown',
      userName: session.user.name || 'Usuário',
      userEmail: session.user.email || '',
      entityType: body.entityType,
      entityId: body.entityId,
      entityName: body.entityName,
      action: body.action,
      changes: body.changes,
      previousSnapshot: body.previousSnapshot,
      currentSnapshot: body.currentSnapshot,
      reason: body.reason,
      metadata: body.metadata,
      createdAt: new Date(),
    };

    auditLogsStore.unshift(log);

    return NextResponse.json(log);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('POST /api/strategic/audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
