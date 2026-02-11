/**
 * API: GET /api/strategic/audit-log/export
 * Exporta audit log em formato CSV - dados reais do banco
 * 
 * @module app/api/strategic/audit-log/export
 */
import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { inArray, sql } from 'drizzle-orm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Tipo para resultado do banco
interface AuditLogRow {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  changes: string | null;
  createdAt: Date | null;
}

/**
 * Formata valor para CSV de forma segura
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
      return JSON.stringify(value, null, 0);
    } catch {
      return '[Complex Object]';
    }
  }
  return String(value);
}

/**
 * Escapa valor para formato CSV
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const GET = withDI(async (request: Request) => {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const actions = searchParams.get('actions')?.split(',').filter(Boolean) || [];
    const entityTypes = searchParams.get('entityTypes')?.split(',').filter(Boolean) || [];
    const userId = searchParams.get('userId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Query usando SQL raw para compatibilidade MSSQL (limite de 10000 para export)
    const entriesResult = await db.execute(sql`
      SELECT TOP 10000
        id,
        action,
        entity,
        entity_id as entityId,
        user_id as userId,
        changes,
        created_at as createdAt
      FROM audit_logs
      WHERE organization_id = ${ctx.organizationId}
        ${search ? sql`AND (entity LIKE ${'%' + search + '%'} OR action LIKE ${'%' + search + '%'})` : sql``}
        ${actions.length > 0 ? sql`AND action IN (${sql.join(actions.map(a => sql`${a}`), sql`, `)})` : sql``}
        ${entityTypes.length > 0 ? sql`AND entity IN (${sql.join(entityTypes.map(e => sql`${e}`), sql`, `)})` : sql``}
        ${userId ? sql`AND user_id = ${userId}` : sql``}
        ${dateFrom ? sql`AND created_at >= ${new Date(dateFrom)}` : sql``}
        ${dateTo ? sql`AND created_at <= ${new Date(dateTo)}` : sql``}
      ORDER BY created_at DESC
    `);

    const entries = ((entriesResult as { recordset?: unknown[] }).recordset || entriesResult) as AuditLogRow[];

    // Buscar nomes de usuários
    const userIds = [...new Set(entries.map((e: AuditLogRow) => e.userId).filter(Boolean))] as string[];
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds))
      : [];

    const usersMap = new Map(usersData.map(u => [u.id, u.name || 'Sem nome']));

    // Build CSV
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Tipo Entidade', 'ID Entidade', 'Alterações'];
    
    const rows = entries.map((entry: AuditLogRow) => {
      const formattedDate = entry.createdAt 
        ? format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : '-';
      
      const userName = usersMap.get(entry.userId || '') || 'Sistema';
      
      // Parse changes JSON e formatar de forma legível
      let changesStr = '-';
      if (entry.changes) {
        try {
          const changesArray = JSON.parse(entry.changes) as Array<{ 
            field?: string; 
            oldValue?: unknown; 
            newValue?: unknown;
            previousValue?: unknown;
          }>;
          if (Array.isArray(changesArray) && changesArray.length > 0) {
            // Formatar cada mudança como "campo: valor_antigo → valor_novo"
            changesStr = changesArray.map(change => {
              const field = change.field || 'valor';
              const oldVal = formatValueForCsv(change.previousValue ?? change.oldValue ?? '');
              const newVal = formatValueForCsv(change.newValue ?? '');
              return `${field}: ${oldVal} → ${newVal}`;
            }).join('; ');
          }
        } catch {
          // Se não for JSON válido, usar o valor raw
          changesStr = formatValueForCsv(entry.changes);
        }
      }
      
      return [
        formattedDate,
        userName,
        entry.action || '-',
        entry.entity || '-',
        entry.entityId || '-',
        changesStr,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => 
        row.map((cell: string) => escapeCsvValue(String(cell))).join(',')
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
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/audit-log/export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
