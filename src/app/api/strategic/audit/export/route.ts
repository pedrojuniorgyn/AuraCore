/**
 * API: Export Audit Logs
 *
 * GET /api/strategic/audit/export - Export audit logs as CSV/XLSX
 *
 * @module app/api/strategic/audit/export
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { AuditLog, AuditEntityType, AuditAction } from '@/lib/audit/audit-types';
import { ENTITY_TYPE_LABELS, ACTION_LABELS } from '@/lib/audit/audit-types';

export const dynamic = 'force-dynamic';

// Reference to the same store
const auditLogsStore: AuditLog[] = [];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const entityType = searchParams.get('entityType') as AuditEntityType | null;
    const action = searchParams.get('action') as AuditAction | null;
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

    // Generate CSV
    const headers = ['Data', 'Usuário', 'Email', 'Entidade', 'Tipo', 'Ação', 'Alterações', 'Motivo'];
    const rows = filtered.map((log) => [
      new Date(log.createdAt).toLocaleString('pt-BR'),
      log.userName,
      log.userEmail,
      log.entityName,
      ENTITY_TYPE_LABELS[log.entityType],
      ACTION_LABELS[log.action],
      log.changes?.length ? `${log.changes.length} campos` : '',
      log.reason || '',
    ]);

    const csv = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/strategic/audit/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
