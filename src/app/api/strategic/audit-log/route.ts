/**
 * API: GET /api/strategic/audit-log
 * Retorna entradas de audit log com filtros e paginação
 * 
 * @module app/api/strategic/audit-log
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    const actions = searchParams.get('actions')?.split(',').filter(Boolean) || [];
    const entityTypes = searchParams.get('entityTypes')?.split(',').filter(Boolean) || [];
    const userId = searchParams.get('userId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // TODO: Buscar dados reais do banco com filtros
    // const auditRepo = container.resolve<IAuditLogRepository>(STRATEGIC_TOKENS.AuditLogRepository);
    // const { entries, total } = await auditRepo.findWithFilters({
    //   search, actions, entityTypes, userId, dateFrom, dateTo,
    //   page, pageSize: 20,
    //   organizationId, branchId
    // });

    // Mock data para desenvolvimento
    const mockEntries = [
      {
        id: 'a1',
        action: 'UPDATE',
        entityType: 'action-plan',
        entityId: 'pdc-002',
        entityTitle: 'PDC-002 - Reverter queda OTD',
        user: { id: 'user-1', name: 'João Silva' },
        changes: [
          { field: 'status', oldValue: 'IN_PROGRESS', newValue: 'COMPLETED' },
          { field: 'progress', oldValue: 75, newValue: 100 },
          { field: 'completedAt', oldValue: null, newValue: '2026-01-20T14:32:00Z' },
        ],
        metadata: { ip: '192.168.1.100', userAgent: 'Chrome/Windows' },
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'a2',
        action: 'COMMENT',
        entityType: 'action-plan',
        entityId: 'pdc-002',
        entityTitle: 'PDC-002 - Reverter queda OTD',
        user: { id: 'user-2', name: 'Maria Santos' },
        changes: [],
        metadata: { ip: '192.168.1.101', userAgent: 'Safari/macOS' },
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'a3',
        action: 'STATUS_CHANGE',
        entityType: 'task',
        entityId: 'task-15',
        entityTitle: 'Tarefa #15 - Analisar gargalos',
        user: { id: 'user-3', name: 'Pedro Lima' },
        changes: [
          { field: 'status', oldValue: 'IN_PROGRESS', newValue: 'DONE' },
        ],
        metadata: {},
        createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      },
      {
        id: 'a4',
        action: 'CREATE',
        entityType: 'action-plan',
        entityId: 'pdc-015',
        entityTitle: 'PDC-015 - Otimizar rotas zona sul',
        user: { id: 'user-1', name: 'João Silva' },
        changes: [],
        metadata: { ip: '192.168.1.100', userAgent: 'Chrome/Windows' },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'a5',
        action: 'AUTO',
        entityType: 'kpi',
        entityId: 'kpi-otd',
        entityTitle: 'KPI OTD',
        user: { id: 'system', name: 'Sistema' },
        changes: [
          { field: 'currentValue', oldValue: 67, newValue: 71 },
        ],
        metadata: {},
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'a6',
        action: 'DELETE',
        entityType: 'swot',
        entityId: 'swot-5',
        entityTitle: 'Item SWOT - Concorrência agressiva',
        user: { id: 'user-3', name: 'Pedro Lima' },
        changes: [],
        metadata: {},
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'a7',
        action: 'UPDATE',
        entityType: 'kpi',
        entityId: 'kpi-nps',
        entityTitle: 'KPI NPS',
        user: { id: 'user-2', name: 'Maria Santos' },
        changes: [
          { field: 'target', oldValue: 75, newValue: 80 },
        ],
        metadata: { ip: '192.168.1.101', userAgent: 'Safari/macOS' },
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'a8',
        action: 'CREATE',
        entityType: 'goal',
        entityId: 'goal-3',
        entityTitle: 'Objetivo - Expandir mercado regional',
        user: { id: 'user-1', name: 'João Silva' },
        changes: [],
        metadata: { ip: '192.168.1.100', userAgent: 'Chrome/Windows' },
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Apply filters (mock implementation)
    let filteredEntries = [...mockEntries];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredEntries = filteredEntries.filter(e => 
        e.entityTitle.toLowerCase().includes(searchLower) ||
        e.user.name.toLowerCase().includes(searchLower)
      );
    }

    if (actions.length > 0) {
      filteredEntries = filteredEntries.filter(e => actions.includes(e.action));
    }

    if (entityTypes.length > 0) {
      filteredEntries = filteredEntries.filter(e => entityTypes.includes(e.entityType));
    }

    if (userId) {
      filteredEntries = filteredEntries.filter(e => e.user.id === userId);
    }

    const totalItems = filteredEntries.length;
    const totalPages = Math.ceil(totalItems / 20);
    const paginatedEntries = filteredEntries.slice((page - 1) * 20, page * 20);

    return NextResponse.json({
      users: [
        { id: 'user-1', name: 'João Silva' },
        { id: 'user-2', name: 'Maria Santos' },
        { id: 'user-3', name: 'Pedro Lima' },
        { id: 'system', name: 'Sistema' },
      ],
      entries: paginatedEntries,
      totalItems,
      totalPages,
      page,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/audit-log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
