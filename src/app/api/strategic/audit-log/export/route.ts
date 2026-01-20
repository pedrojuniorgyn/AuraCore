/**
 * API: GET /api/strategic/audit-log/export
 * Exporta audit log em formato CSV
 * 
 * @module app/api/strategic/audit-log/export
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

/**
 * Formata valor para CSV de forma consistente com a UI (ChangesDiff)
 * FIX Bug 2: Evita [object Object] no CSV
 */
function formatValueForCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 0); // Sem indentação para CSV
    } catch {
      return '[Complex Object]';
    }
  }
  return String(value);
}

/**
 * Escapa valor para formato CSV (aspas duplas)
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const actions = searchParams.get('actions')?.split(',').filter(Boolean) || [];
    const entityTypes = searchParams.get('entityTypes')?.split(',').filter(Boolean) || [];
    const userId = searchParams.get('userId') || '';
    
    // FIX Bug 1: Ler filtros de data
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // TODO: Buscar dados reais do banco com filtros
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
          { field: 'metadata', oldValue: { priority: 'high' }, newValue: { priority: 'critical', urgent: true } },
        ],
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
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'a3',
        action: 'CREATE',
        entityType: 'action-plan',
        entityId: 'pdc-015',
        entityTitle: 'PDC-015 - Otimizar rotas zona sul',
        user: { id: 'user-1', name: 'João Silva' },
        changes: [],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Apply filters
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

    // FIX Bug 1: Aplicar filtros de data
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filteredEntries = filteredEntries.filter(e => new Date(e.createdAt) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir o dia final completo
      filteredEntries = filteredEntries.filter(e => new Date(e.createdAt) <= toDate);
    }

    // Build CSV
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Tipo Entidade', 'ID Entidade', 'Título', 'Alterações'];
    
    const rows = filteredEntries.map(entry => {
      const formattedDate = format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR });
      
      // FIX Bug 2: Usar formatValueForCsv para valores de changes
      const changesStr = entry.changes
        .map(c => `${c.field}: ${formatValueForCsv(c.oldValue)} → ${formatValueForCsv(c.newValue)}`)
        .join('; ');
      
      return [
        formattedDate,
        entry.user.name,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.entityTitle,
        changesStr || '-',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => escapeCsvValue(String(cell))).join(',')
      ),
    ].join('\n');

    // Return as CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/strategic/audit-log/export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
