/**
 * API: GET /api/strategic/activity
 * Retorna atividades recentes baseadas em audit logs
 * 
 * @module app/api/strategic/activity
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { auditLogs, users } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'comment' | 'status_change';
  description: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  changes?: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
}

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

// Mapeia ações do audit log para tipos de atividade
function mapActionToType(action: string): Activity['type'] {
  const map: Record<string, Activity['type']> = {
    'CREATE': 'create',
    'UPDATE': 'update',
    'DELETE': 'delete',
    'APPROVE': 'approve',
    'REJECT': 'reject',
    'COMMENT': 'comment',
    'STATUS_CHANGE': 'status_change',
  };
  return map[action?.toUpperCase()] || 'update';
}

// Gera descrição legível para a atividade
function generateDescription(action: string, entity: string, entityId: string | null): string {
  const actionLabels: Record<string, string> = {
    'CREATE': 'criou',
    'UPDATE': 'atualizou',
    'DELETE': 'removeu',
    'APPROVE': 'aprovou',
    'REJECT': 'rejeitou',
    'COMMENT': 'comentou em',
    'STATUS_CHANGE': 'alterou status de',
  };
  const label = actionLabels[action?.toUpperCase()] || 'modificou';
  return `${label} ${entity} #${entityId || 'N/A'}`;
}

export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Query usando SQL raw para compatibilidade MSSQL
    const logsResult = await db.execute(sql`
      SELECT TOP ${limit}
        id,
        action,
        entity,
        entity_id as entityId,
        user_id as userId,
        changes,
        created_at as createdAt
      FROM audit_logs
      WHERE organization_id = ${ctx.organizationId}
        ${entityType ? sql`AND entity = ${entityType}` : sql``}
        ${entityId ? sql`AND entity_id = ${entityId}` : sql``}
      ORDER BY created_at DESC
    `);

    const logs = ((logsResult as { recordset?: unknown[] }).recordset || logsResult) as AuditLogRow[];

    // Buscar nomes de usuários
    const userIds = [...new Set(logs.map((l: AuditLogRow) => l.userId).filter(Boolean))] as string[];
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds))
      : [];

    const usersMap = new Map(usersData.map(u => [u.id, u.name || 'Sem nome']));

    // Formatar resposta
    const activities: Activity[] = logs.map((log: AuditLogRow) => {
      let parsedChanges: Array<{ field: string; oldValue?: unknown; newValue?: unknown }> = [];
      
      if (log.changes) {
        try {
          parsedChanges = JSON.parse(log.changes);
        } catch {
          // Se não for JSON válido, ignorar
        }
      }

      return {
        id: String(log.id),
        type: mapActionToType(log.action),
        description: generateDescription(log.action, log.entity, log.entityId),
        entityType: log.entity,
        entityId: log.entityId || '',
        userId: log.userId || 'system',
        userName: usersMap.get(log.userId || '') || 'Sistema',
        timestamp: log.createdAt?.toISOString() || new Date().toISOString(),
        changes: parsedChanges.length > 0 ? parsedChanges : undefined,
      };
    });

    return NextResponse.json({ activities });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
