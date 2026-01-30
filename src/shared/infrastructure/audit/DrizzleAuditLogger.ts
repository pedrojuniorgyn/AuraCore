/**
 * Infrastructure: DrizzleAuditLogger
 * Implementação do Audit Logger usando Drizzle ORM
 *
 * @module shared/infrastructure/audit
 */
import { injectable } from 'tsyringe';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditLogTable } from './audit-log.schema';
import type { IAuditLogger, AuditSearchFilters } from './IAuditLogger';
import type { AuditLogEntry, AuditOperation, AuditContext } from './AuditLog';

@injectable()
export class DrizzleAuditLogger implements IAuditLogger {
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const id = globalThis.crypto.randomUUID();
    const timestamp = new Date();

    await db.insert(auditLogTable).values({
      id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      operation: entry.operation,
      userId: entry.userId,
      userName: entry.userName || null,
      organizationId: entry.organizationId,
      branchId: entry.branchId,
      timestamp,
      previousValues: entry.previousValues ? JSON.stringify(entry.previousValues) : null,
      newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
      changedFields: entry.changedFields ? JSON.stringify(entry.changedFields) : null,
      clientIp: entry.clientIp || null,
      userAgent: entry.userAgent || null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  }

  async logInsert<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    newValues: T,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      operation: 'INSERT',
      newValues: this.sanitizeValues(newValues),
      ...context,
    });
  }

  async logUpdate<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    previousValues: T,
    newValues: T,
    context: AuditContext
  ): Promise<void> {
    const changedFields = this.getChangedFields(previousValues, newValues);

    await this.log({
      entityType,
      entityId,
      operation: 'UPDATE',
      previousValues: this.sanitizeValues(previousValues),
      newValues: this.sanitizeValues(newValues),
      changedFields,
      ...context,
    });
  }

  async logDelete<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    previousValues: T,
    context: AuditContext,
    softDelete = true
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      operation: softDelete ? 'SOFT_DELETE' : 'DELETE',
      previousValues: this.sanitizeValues(previousValues),
      ...context,
    });
  }

  async getHistory(
    entityType: string,
    entityId: string,
    limit = 50
  ): Promise<AuditLogEntry[]> {
    const rows = await db.execute<typeof auditLogTable.$inferSelect>(sql`
      SELECT TOP ${sql.raw(String(limit))} *
      FROM ${auditLogTable}
      WHERE ${eq(auditLogTable.entityType, entityType)}
        AND ${eq(auditLogTable.entityId, entityId)}
      ORDER BY ${auditLogTable.timestamp} DESC
    `);

    const results = Array.isArray(rows) ? rows : (rows as { recordset?: unknown[] }).recordset || [];
    return (results as typeof auditLogTable.$inferSelect[]).map(this.mapToEntry);
  }

  async search(filters: AuditSearchFilters): Promise<{
    items: AuditLogEntry[];
    total: number;
  }> {
    const conditions = [
      eq(auditLogTable.organizationId, filters.organizationId),
      eq(auditLogTable.branchId, filters.branchId),
    ];

    if (filters.entityType) {
      conditions.push(eq(auditLogTable.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(auditLogTable.entityId, filters.entityId));
    }
    if (filters.operation) {
      conditions.push(eq(auditLogTable.operation, filters.operation));
    }
    if (filters.userId) {
      conditions.push(eq(auditLogTable.userId, filters.userId));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogTable.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogTable.timestamp, filters.endDate));
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const offset = (page - 1) * pageSize;

    const whereClause = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db.execute<typeof auditLogTable.$inferSelect>(sql`
        SELECT *
        FROM ${auditLogTable}
        WHERE ${whereClause}
        ORDER BY ${auditLogTable.timestamp} DESC
        OFFSET ${sql.raw(String(offset))} ROWS
        FETCH NEXT ${sql.raw(String(pageSize))} ROWS ONLY
      `),
      db.execute<{ count: number }>(sql`
        SELECT COUNT(*) as count
        FROM ${auditLogTable}
        WHERE ${whereClause}
      `),
    ]);

    const items = Array.isArray(rows) ? rows : (rows as { recordset?: unknown[] }).recordset || [];
    const counts = Array.isArray(countResult) ? countResult : (countResult as { recordset?: unknown[] }).recordset || [];

    return {
      items: (items as typeof auditLogTable.$inferSelect[]).map(this.mapToEntry),
      total: Number((counts as { count: number }[])[0]?.count || 0),
    };
  }

  private mapToEntry(row: typeof auditLogTable.$inferSelect): AuditLogEntry {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      operation: row.operation as AuditOperation,
      userId: row.userId,
      userName: row.userName || undefined,
      organizationId: row.organizationId,
      branchId: row.branchId,
      timestamp: row.timestamp,
      previousValues: row.previousValues ? JSON.parse(row.previousValues) : undefined,
      newValues: row.newValues ? JSON.parse(row.newValues) : undefined,
      changedFields: row.changedFields ? JSON.parse(row.changedFields) : undefined,
      clientIp: row.clientIp || undefined,
      userAgent: row.userAgent || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private getChangedFields<T extends Record<string, unknown>>(
    previous: T,
    current: T
  ): string[] {
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

    for (const key of allKeys) {
      if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        changed.push(key);
      }
    }

    return changed;
  }

  private sanitizeValues<T extends Record<string, unknown>>(values: T): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
      // Não logar campos sensíveis
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /apikey/i,
      /credential/i,
      /certificate/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(fieldName));
  }
}
