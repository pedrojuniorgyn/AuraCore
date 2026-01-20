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

    // Build CSV
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Tipo Entidade', 'ID Entidade', 'Título', 'Alterações'];
    
    const rows = filteredEntries.map(entry => {
      const formattedDate = format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const changesStr = entry.changes
        .map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`)
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
        row.map(cell => {
          const str = String(cell);
          // Escape quotes and wrap if contains comma or quote
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
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
