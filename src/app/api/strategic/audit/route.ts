/**
 * API: Strategic Audit Logs
 *
 * GET /api/strategic/audit - List audit logs from database
 * POST /api/strategic/audit - Create audit log
 *
 * @module app/api/strategic/audit
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { auditLogs, users } from '@/lib/db/schema';
import { inArray, sql } from 'drizzle-orm';
import type { AuditLog, AuditEntityType, AuditAction } from '@/lib/audit/audit-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Tipo para resultado de audit logs
interface AuditLogRow {
  id: number;
  organizationId: number;
  userId: string | null;
  entity: string;
  entityId: string | null;
  action: string;
  changes: string | null;
  createdAt: Date | null;
}

export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100); // 🔐 Limite máximo para prevenir DoS
    const entityType = searchParams.get('entityType') as AuditEntityType | null;
    const action = searchParams.get('action') as AuditAction | null;
    const userId = searchParams.get('userId');
    const searchQuery = searchParams.get('q');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Query usando SQL raw para compatibilidade MSSQL
    // IMPORTANTE: MSSQL requer OFFSET...FETCH para paginação correta (não usar TOP com OFFSET)
    // BUG-FIX: Usar mesmos filtros para paginação e contagem (evitar inconsistência)
    const offset = (page - 1) * pageSize;
    
    // Construir fragmentos SQL para reutilizar nos dois queries
    const entityFilter = entityType ? sql`AND entity = ${entityType}` : sql``;
    const actionFilter = action ? sql`AND action = ${action}` : sql``;
    const userFilter = userId ? sql`AND user_id = ${userId}` : sql``;
    const searchFilter = searchQuery 
      ? sql`AND (entity LIKE ${'%' + searchQuery + '%'} OR action LIKE ${'%' + searchQuery + '%'})` 
      : sql``;
    const startDateFilter = startDate ? sql`AND created_at >= ${new Date(startDate)}` : sql``;
    const endDateFilter = endDate ? sql`AND created_at <= ${new Date(endDate)}` : sql``;

    const logsResult = await db.execute(sql`
      SELECT
        id,
        organization_id as organizationId,
        user_id as userId,
        entity,
        entity_id as entityId,
        action,
        changes,
        created_at as createdAt
      FROM audit_logs
      WHERE organization_id = ${ctx.organizationId}
        ${entityFilter}
        ${actionFilter}
        ${userFilter}
        ${searchFilter}
        ${startDateFilter}
        ${endDateFilter}
      ORDER BY created_at DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);

    const logs = ((logsResult as { recordset?: unknown[] }).recordset || logsResult) as AuditLogRow[];

    // Contar total usando mesmos filtros (SQL raw para consistência)
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = ${ctx.organizationId}
        ${entityFilter}
        ${actionFilter}
        ${userFilter}
        ${searchFilter}
        ${startDateFilter}
        ${endDateFilter}
    `);
    
    const countData = ((countResult as { recordset?: unknown[] }).recordset || countResult) as Array<{ count: number }>;
    const total = countData[0]?.count || 0;
    const hasMore = page * pageSize < total;

    // Buscar nomes de usuários
    const userIds = [...new Set(logs.map((l: AuditLogRow) => l.userId).filter(Boolean))] as string[];
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, userIds))
      : [];

    const usersMap = new Map(usersData.map(u => [u.id, { name: u.name, email: u.email }]));

    // Formatar resposta
    const formattedLogs: AuditLog[] = logs.map((log: AuditLogRow) => {
      const user = usersMap.get(log.userId || '');
      
      // Parse changes (JSON string) para array com tipo correto
      let changes: Array<{ field: string; previousValue: unknown; newValue: unknown; changeType: 'added' | 'removed' | 'modified' }> | undefined;
      if (log.changes) {
        try {
          const parsed = JSON.parse(log.changes);
          if (Array.isArray(parsed)) {
            changes = parsed.map((c: { field?: string; oldValue?: unknown; newValue?: unknown; previousValue?: unknown }) => ({
              field: c.field || 'value',
              previousValue: c.previousValue ?? c.oldValue ?? null,
              newValue: c.newValue ?? null,
              changeType: 'modified' as const,
            }));
          }
        } catch {
          // Ignorar se não for JSON válido
        }
      }

      return {
        id: String(log.id),
        organizationId: log.organizationId,
        branchId: ctx.branchId, // schema não tem branchId, usar contexto do usuário
        userId: log.userId || 'system',
        userName: user?.name || 'Sistema',
        userEmail: user?.email || '',
        entityType: (log.entity || 'unknown') as AuditEntityType,
        entityId: log.entityId || String(log.id),
        entityName: `${log.entity || 'Item'} #${log.entityId || log.id}`,
        action: (log.action || 'view') as AuditAction,
        changes,
        createdAt: log.createdAt || new Date(),
      };
    });

    return NextResponse.json({
      logs: formattedLogs,
      total,
      page,
      pageSize,
      hasMore,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const body = await request.json();

    // Preparar changes como JSON
    let changesJson: string | null = null;
    if (body.previousSnapshot || body.currentSnapshot) {
      changesJson = JSON.stringify([{
        field: 'snapshot',
        oldValue: body.previousSnapshot,
        newValue: body.currentSnapshot,
      }]);
    }

    // Inserir no banco usando campos corretos do schema
    await db.insert(auditLogs).values({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entity: body.entityType || 'unknown',
      entityId: body.entityId,
      action: body.action || 'update',
      changes: changesJson,
    });

    return NextResponse.json({
      id: String(Date.now()),
      success: true,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
