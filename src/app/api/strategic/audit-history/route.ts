/**
 * API Routes: /api/strategic/audit-history
 * Histórico de auditoria das entidades do módulo Strategic
 *
 * @module app/api/strategic/audit-history
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, inArray, like, sql, or } from 'drizzle-orm';
import { getTenantContext } from '@/lib/auth/context';
import { auditLogTable, type AuditLogRow } from '@/shared/infrastructure/audit/audit-log.schema';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { AuditEntityType } from '@/lib/audit/audit-types';

export const dynamic = 'force-dynamic';

// Entidades do módulo Strategic que podem ser auditadas
const STRATEGIC_ENTITY_TYPES: AuditEntityType[] = [
  'kpi',
  'action_plan',
  'pdca_cycle',
  'goal',
  'template',
  'control_item',
  'verification_item',
  'anomaly',
  'standard_procedure',
  'dashboard_config',
  'comment',
];

const querySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  operation: z.enum(['INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE']).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/strategic/audit-history
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const queryParams = {
      entityType: searchParams.get('entityType') ?? undefined,
      entityId: searchParams.get('entityId') ?? undefined,
      operation: searchParams.get('operation') ?? undefined,
      userId: searchParams.get('userId') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? '1',
      pageSize: searchParams.get('pageSize') ?? '20',
    };

    const validation = querySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { entityType, entityId, operation, userId, startDate, endDate, search, page, pageSize } =
      validation.data;

    // Build conditions
    const conditions = [
      eq(auditLogTable.organizationId, context.organizationId),
      eq(auditLogTable.branchId, context.branchId),
      inArray(auditLogTable.entityType, STRATEGIC_ENTITY_TYPES),
    ];

    if (entityType) {
      conditions.push(eq(auditLogTable.entityType, entityType));
    }

    if (entityId) {
      conditions.push(eq(auditLogTable.entityId, entityId));
    }

    if (operation) {
      conditions.push(eq(auditLogTable.operation, operation));
    }

    if (userId) {
      conditions.push(eq(auditLogTable.userId, userId));
    }

    if (startDate) {
      conditions.push(gte(auditLogTable.timestamp, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogTable.timestamp, new Date(endDate)));
    }

    if (search) {
      conditions.push(
        or(
          like(auditLogTable.userName, `%${search}%`),
          like(auditLogTable.entityId, `%${search}%`)
        )!
      );
    }

    const offset = (page - 1) * pageSize;

    // Query logs with MSSQL-compatible pagination
    const baseQuery = db
      .select()
      .from(auditLogTable)
      .where(and(...conditions))
      .orderBy(desc(auditLogTable.timestamp));

    const [logs, countResult] = await Promise.all([
      queryPaginated<AuditLogRow>(baseQuery, { page, pageSize }),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(auditLogTable)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;

    // Parse JSON fields and format response
    const formattedLogs = logs.map((log: AuditLogRow) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      operation: log.operation,
      userId: log.userId,
      userName: log.userName,
      timestamp: log.timestamp,
      previousValues: log.previousValues ? JSON.parse(log.previousValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      changedFields: log.changedFields ? JSON.parse(log.changedFields) : null,
      clientIp: log.clientIp,
      userAgent: log.userAgent,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return NextResponse.json({
      items: formattedLogs,
      total,
      page,
      pageSize,
      hasMore: offset + logs.length < total,
      filters: {
        entityType,
        entityId,
        operation,
        userId,
        startDate,
        endDate,
        search,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/audit-history error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
