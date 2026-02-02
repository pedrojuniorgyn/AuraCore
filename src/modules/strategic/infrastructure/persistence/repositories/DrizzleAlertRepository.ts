/**
 * Repository: DrizzleAlertRepository
 * Implementação Drizzle do repositório de Alertas
 *
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, desc, sql } from 'drizzle-orm';
import type { IAlertRepository, AlertFilter } from '../../../domain/ports/output/IAlertRepository';
import { Alert, type AlertType } from '../../../domain/entities/Alert';
import { AlertMapper } from '../mappers/AlertMapper';
import { strategicAlertTable } from '../schemas/alert.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';
import { injectable } from 'tsyringe';

@injectable()
export class DrizzleAlertRepository implements IAlertRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Alert | null> {
    const rows = await db
      .select()
      .from(strategicAlertTable)
      .where(
        and(
          eq(strategicAlertTable.id, id),
          eq(strategicAlertTable.organizationId, organizationId),
          eq(strategicAlertTable.branchId, branchId)
        )
      );

    if (rows.length === 0) return null;

    const result = AlertMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByEntity(
    organizationId: number,
    branchId: number,
    entityType: string,
    entityId: string,
    alertType: AlertType
  ): Promise<Alert | null> {
    const rows = await db
      .select()
      .from(strategicAlertTable)
      .where(
        and(
          eq(strategicAlertTable.organizationId, organizationId),
          eq(strategicAlertTable.branchId, branchId),
          eq(strategicAlertTable.entityType, entityType),
          eq(strategicAlertTable.entityId, entityId),
          eq(strategicAlertTable.alertType, alertType),
          eq(strategicAlertTable.status, 'PENDING')
        )
      );

    if (rows.length === 0) return null;

    const result = AlertMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findPending(
    organizationId: number,
    branchId: number
  ): Promise<Alert[]> {
    const rows = await db
      .select()
      .from(strategicAlertTable)
      .where(
        and(
          eq(strategicAlertTable.organizationId, organizationId),
          eq(strategicAlertTable.branchId, branchId),
          eq(strategicAlertTable.status, 'PENDING')
        )
      )
      .orderBy(desc(strategicAlertTable.createdAt));

    return rows
      .map(row => AlertMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findMany(filter: AlertFilter): Promise<{
    items: Alert[];
    total: number;
  }> {
    const {
      organizationId, branchId, status, alertType,
      severity, entityType, entityId,
      page = 1, pageSize = 20
    } = filter;

    // Build conditions (multi-tenancy)
    const conditions = [
      eq(strategicAlertTable.organizationId, organizationId),
      eq(strategicAlertTable.branchId, branchId)
    ];

    if (status) {
      conditions.push(eq(strategicAlertTable.status, status));
    }
    if (alertType) {
      conditions.push(eq(strategicAlertTable.alertType, alertType));
    }
    if (severity) {
      conditions.push(eq(strategicAlertTable.severity, severity));
    }
    if (entityType) {
      conditions.push(eq(strategicAlertTable.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(strategicAlertTable.entityId, entityId));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(strategicAlertTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(strategicAlertTable)
      .where(and(...conditions))
      .orderBy(desc(strategicAlertTable.createdAt));

    const rows = await queryPaginated<typeof strategicAlertTable.$inferSelect>(query, { page, pageSize });

    const items = rows
      .map((row) => AlertMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);

    return { items, total };
  }

  async save(entity: Alert): Promise<void> {
    const persistence = AlertMapper.toPersistence(entity);

    const existing = await this.exists(
      entity.id,
      entity.organizationId,
      entity.branchId
    );

    if (existing) {
      await db
        .update(strategicAlertTable)
        .set({
          alertType: persistence.alertType,
          severity: persistence.severity,
          entityType: persistence.entityType,
          entityId: persistence.entityId,
          entityName: persistence.entityName,
          title: persistence.title,
          message: persistence.message,
          currentValue: persistence.currentValue,
          thresholdValue: persistence.thresholdValue,
          status: persistence.status,
          sentAt: persistence.sentAt,
          acknowledgedAt: persistence.acknowledgedAt,
          acknowledgedBy: persistence.acknowledgedBy,
          dismissedAt: persistence.dismissedAt,
          dismissedBy: persistence.dismissedBy,
          dismissReason: persistence.dismissReason,
          updatedAt: persistence.updatedAt,
        })
        .where(
          and(
            eq(strategicAlertTable.id, persistence.id),
            eq(strategicAlertTable.organizationId, persistence.organizationId),
            eq(strategicAlertTable.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(strategicAlertTable).values(persistence);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .delete(strategicAlertTable)
      .where(
        and(
          eq(strategicAlertTable.id, id),
          eq(strategicAlertTable.organizationId, organizationId),
          eq(strategicAlertTable.branchId, branchId)
        )
      );
  }

  private async exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(strategicAlertTable)
      .where(
        and(
          eq(strategicAlertTable.id, id),
          eq(strategicAlertTable.organizationId, organizationId),
          eq(strategicAlertTable.branchId, branchId)
        )
      );

    return Number(result[0]?.count ?? 0) > 0;
  }
}
