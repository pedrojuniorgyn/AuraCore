/**
 * API: GET /api/strategic/audit-log
 * Retorna logs de auditoria do módulo estratégico
 * 
 * @module app/api/strategic/audit-log
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { auditLogs, users } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Tipo para resultado do banco
interface AuditLogRow {
  id: number;
  organizationId: number;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: string | null;
  createdAt: Date | null;
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100);
    const search = searchParams.get('search') || '';
    const actions = searchParams.get('actions')?.split(',').filter(Boolean) || [];
    const entityTypes = searchParams.get('entityTypes')?.split(',').filter(Boolean) || [];
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const offset = (page - 1) * pageSize;

    // Query usando SQL raw para compatibilidade MSSQL
    const entriesResult = await db.execute(sql`
      SELECT 
        id,
        organization_id as organizationId,
        user_id as userId,
        action,
        entity,
        entity_id as entityId,
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
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);

    const entries = ((entriesResult as { recordset?: unknown[] }).recordset || entriesResult) as AuditLogRow[];

    // Contar total COM os mesmos filtros aplicados
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = ${ctx.organizationId}
        ${search ? sql`AND (entity LIKE ${'%' + search + '%'} OR action LIKE ${'%' + search + '%'})` : sql``}
        ${actions.length > 0 ? sql`AND action IN (${sql.join(actions.map(a => sql`${a}`), sql`, `)})` : sql``}
        ${entityTypes.length > 0 ? sql`AND entity IN (${sql.join(entityTypes.map(e => sql`${e}`), sql`, `)})` : sql``}
        ${userId ? sql`AND user_id = ${userId}` : sql``}
        ${dateFrom ? sql`AND created_at >= ${new Date(dateFrom)}` : sql``}
        ${dateTo ? sql`AND created_at <= ${new Date(dateTo)}` : sql``}
    `);

    const countData = ((countResult as unknown as { recordset?: Array<{ count: number }> }).recordset || countResult) as Array<{ count: number }>;
    const totalItems = countData[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasMore = page < totalPages;

    // Buscar nomes de usuários
    const userIds = [...new Set(entries.map((e: AuditLogRow) => e.userId).filter(Boolean))] as string[];
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, userIds))
      : [];

    const usersMap = new Map(usersData.map(u => [u.id, { name: u.name, email: u.email }]));

    // Formatar resposta
    const formattedEntries = entries.map((entry: AuditLogRow) => {
      const user = usersMap.get(entry.userId || '');
      let parsedChanges: Array<{ field: string; oldValue?: unknown; newValue?: unknown }> = [];
      
      if (entry.changes) {
        try {
          parsedChanges = JSON.parse(entry.changes);
        } catch {
          // Se não for JSON válido, ignorar
        }
      }

      return {
        id: String(entry.id),
        action: entry.action,
        entityType: entry.entity,
        entityId: entry.entityId,
        entityTitle: `${entry.entity} #${entry.entityId || entry.id}`,
        user: {
          id: entry.userId || 'system',
          name: user?.name || 'Sistema',
          email: user?.email || '',
        },
        changes: parsedChanges,
        createdAt: entry.createdAt?.toISOString() || new Date().toISOString(),
      };
    });

    // Formatar lista de usuários para UI
    const usersList = usersData.map(u => ({
      id: u.id,
      name: u.name || 'Sem nome',
      email: u.email || '',
    }));

    return NextResponse.json({
      entries: formattedEntries,
      users: usersList,
      totalItems,
      totalPages,
      page,
      pageSize,
      hasMore,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/audit-log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
