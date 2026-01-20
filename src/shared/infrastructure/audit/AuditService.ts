/**
 * Audit Service
 * 
 * Serviço centralizado para registrar e consultar audit trail.
 * 
 * Características:
 * - Append-only (imutável)
 * - Detecta campos alterados automaticamente
 * - Suporta JSON para valores complexos
 * - Multi-tenancy aware
 * 
 * @example
 * ```typescript
 * await auditService.recordAudit(
 *   'fiscal_documents',
 *   document.id,
 *   'UPDATE',
 *   context,
 *   oldDocument,
 *   newDocument
 * );
 * ```
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { AuditContext, AuditOperation, AuditRecord, AuditHistoryOptions, AuditableEntity } from './audit.types';
import { AUDITABLE_ENTITIES } from './audit.types';

export class AuditService {
  private static instance: AuditService;

  private constructor() {
    // Singleton
  }

  /**
   * Obtém instância singleton do serviço
   */
  static getInstance(): AuditService {
    if (!this.instance) {
      this.instance = new AuditService();
    }
    return this.instance;
  }

  /**
   * Registra uma operação de auditoria
   * 
   * @param entityType - Nome da tabela (ex: 'fiscal_documents')
   * @param entityId - ID da entidade
   * @param operation - Tipo de operação (INSERT, UPDATE, DELETE)
   * @param context - Contexto do usuário/request
   * @param oldValues - Valores antes da alteração (opcional para INSERT)
   * @param newValues - Valores após a alteração (opcional para DELETE)
   */
  async recordAudit<T extends Record<string, unknown>>(
    entityType: AuditableEntity,
    entityId: string,
    operation: AuditOperation,
    context: AuditContext,
    oldValues?: T | null,
    newValues?: T | null
  ): Promise<void> {
    // Validar entidade
    if (!AUDITABLE_ENTITIES.includes(entityType)) {
      console.warn(`[AuditService] Entity type '${entityType}' is not in the auditable list`);
    }

    const changedFields = this.getChangedFields(oldValues, newValues);
    const auditId = globalThis.crypto.randomUUID();
    const now = new Date();
    const tableName = `${entityType}_audit`;

    try {
      await db.execute(sql`
        INSERT INTO ${sql.raw(tableName)} (
          id,
          entity_id,
          entity_type,
          organization_id,
          branch_id,
          operation,
          old_values,
          new_values,
          changed_fields,
          reason,
          changed_by,
          changed_by_name,
          changed_at,
          ip_address,
          user_agent,
          request_id,
          created_at
        ) VALUES (
          ${auditId},
          ${entityId},
          ${entityType},
          ${context.organizationId},
          ${context.branchId},
          ${operation},
          ${oldValues ? JSON.stringify(oldValues) : null},
          ${newValues ? JSON.stringify(newValues) : null},
          ${changedFields.length > 0 ? JSON.stringify(changedFields) : null},
          ${context.reason || null},
          ${context.userId},
          ${context.userName || null},
          ${now},
          ${context.ipAddress || null},
          ${context.userAgent || null},
          ${context.requestId || null},
          ${now}
        )
      `);
    } catch (error) {
      // Não falhar a operação principal por erro de auditoria
      console.error(`[AuditService] Failed to record audit for ${entityType}:${entityId}`, error);
    }
  }

  /**
   * Obtém histórico de auditoria de uma entidade
   */
  async getAuditHistory(options: AuditHistoryOptions): Promise<AuditRecord[]> {
    const {
      entityId,
      entityType,
      organizationId,
      branchId,
      limit = 50,
      offset = 0,
      operation,
      dateFrom,
      dateTo,
      changedBy,
    } = options;

    const tableName = `${entityType}_audit`;

    // Construir condições WHERE
    const conditions: string[] = [
      `entity_id = '${entityId}'`,
      `organization_id = ${organizationId}`,
      `branch_id = ${branchId}`,
    ];

    if (operation) {
      conditions.push(`operation = '${operation}'`);
    }

    if (dateFrom) {
      conditions.push(`changed_at >= '${dateFrom.toISOString()}'`);
    }

    if (dateTo) {
      conditions.push(`changed_at <= '${dateTo.toISOString()}'`);
    }

    if (changedBy) {
      conditions.push(`changed_by = '${changedBy}'`);
    }

    const whereClause = conditions.join(' AND ');

    try {
      const result = await db.execute(sql.raw(`
        SELECT 
          id,
          entity_id AS entityId,
          entity_type AS entityType,
          organization_id AS organizationId,
          branch_id AS branchId,
          operation,
          old_values AS oldValues,
          new_values AS newValues,
          changed_fields AS changedFields,
          reason,
          changed_by AS changedBy,
          changed_by_name AS changedByName,
          changed_at AS changedAt,
          ip_address AS ipAddress,
          user_agent AS userAgent,
          request_id AS requestId,
          created_at AS createdAt
        FROM ${tableName}
        WHERE ${whereClause}
        ORDER BY changed_at DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `));

      // Parse JSON fields
      return (result as unknown as AuditRecord[]).map((row) => ({
        ...row,
        oldValues: row.oldValues ? JSON.parse(row.oldValues as unknown as string) : null,
        newValues: row.newValues ? JSON.parse(row.newValues as unknown as string) : null,
        changedFields: row.changedFields ? JSON.parse(row.changedFields as unknown as string) : null,
      }));
    } catch (error) {
      console.error(`[AuditService] Failed to get audit history for ${entityType}:${entityId}`, error);
      return [];
    }
  }

  /**
   * Conta registros de auditoria de uma entidade
   */
  async countAuditRecords(
    entityType: AuditableEntity,
    entityId: string,
    organizationId: number,
    branchId: number
  ): Promise<number> {
    const tableName = `${entityType}_audit`;

    try {
      const result = await db.execute(sql.raw(`
        SELECT COUNT(*) AS total
        FROM ${tableName}
        WHERE entity_id = '${entityId}'
          AND organization_id = ${organizationId}
          AND branch_id = ${branchId}
      `));

      const rows = result as unknown as Array<{ total: number }>;
      return rows[0]?.total ?? 0;
    } catch (error) {
      console.error(`[AuditService] Failed to count audit records`, error);
      return 0;
    }
  }

  /**
   * Detecta campos que foram alterados entre dois objetos
   */
  private getChangedFields<T extends Record<string, unknown>>(
    oldValues?: T | null,
    newValues?: T | null
  ): string[] {
    if (!oldValues || !newValues) {
      return [];
    }

    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    for (const key of allKeys) {
      const oldVal = oldValues[key];
      const newVal = newValues[key];

      // Comparar usando JSON.stringify para lidar com objetos/arrays
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}

// Singleton export
export const auditService = AuditService.getInstance();
