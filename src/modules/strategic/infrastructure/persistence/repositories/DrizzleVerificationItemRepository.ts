/**
 * Repository: DrizzleVerificationItemRepository
 * Implementação Drizzle do IVerificationItemRepository
 *
 * ⚠️ MULTI-TENANCY: Todas as queries DEVEM filtrar por organizationId E branchId
 *
 * @module strategic/infrastructure/persistence/repositories
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IVerificationItemRepository, VerificationItemFilters } from '../../../domain/ports/output/IVerificationItemRepository';
import type { VerificationItem } from '../../../domain/entities/VerificationItem';
import { VerificationItemMapper } from '../mappers/VerificationItemMapper';
import { verificationItemTable } from '../schemas/verification-item.schema';
import { Result } from '@/shared/domain';

@injectable()
export class DrizzleVerificationItemRepository implements IVerificationItemRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<VerificationItem | null> {
    const rows = await db
      .select()
      .from(verificationItemTable)
      .where(
        and(
          eq(verificationItemTable.id, id),
          eq(verificationItemTable.organizationId, organizationId),
          eq(verificationItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(verificationItemTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = VerificationItemMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByControlItemId(
    controlItemId: string,
    organizationId: number,
    branchId: number
  ): Promise<VerificationItem[]> {
    const rows = await db
      .select()
      .from(verificationItemTable)
      .where(
        and(
          eq(verificationItemTable.controlItemId, controlItemId),
          eq(verificationItemTable.organizationId, organizationId),
          eq(verificationItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(verificationItemTable.deletedAt)
        )
      );

    return VerificationItemMapper.toDomainList(rows);
  }

  async findAll(
    organizationId: number,
    branchId: number,
    filters?: VerificationItemFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ items: VerificationItem[]; total: number }> {
    // ⚠️ MULTI-TENANCY: Sempre filtrar por org + branch
    const conditions = [
      eq(verificationItemTable.organizationId, organizationId),
      eq(verificationItemTable.branchId, branchId),
      isNull(verificationItemTable.deletedAt),
    ];

    if (filters?.controlItemId) {
      conditions.push(eq(verificationItemTable.controlItemId, filters.controlItemId));
    }
    if (filters?.status) {
      conditions.push(eq(verificationItemTable.status, filters.status));
    }
    if (filters?.responsibleUserId) {
      conditions.push(eq(verificationItemTable.responsibleUserId, filters.responsibleUserId));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(verificationItemTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(verificationItemTable)
      .where(and(...conditions))
      .orderBy(desc(verificationItemTable.createdAt));

    const rows = await queryPaginated<typeof verificationItemTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    return {
      items: VerificationItemMapper.toDomainList(rows),
      total,
    };
  }

  async findOverdue(
    organizationId: number,
    branchId: number
  ): Promise<VerificationItem[]> {
    const rows = await db
      .select()
      .from(verificationItemTable)
      .where(
        and(
          eq(verificationItemTable.organizationId, organizationId),
          eq(verificationItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          eq(verificationItemTable.status, 'ACTIVE'),
          isNull(verificationItemTable.deletedAt)
        )
      );

    // Filtrar usando entity.isOverdue() conforme especificado
    const entities = VerificationItemMapper.toDomainList(rows);
    return entities.filter((entity) => entity.isOverdue());
  }

  async save(entity: VerificationItem): Promise<Result<void, string>> {
    try {
      const row = VerificationItemMapper.toPersistence(entity);

      // Check if exists
      const existing = await db
        .select()
        .from(verificationItemTable)
        .where(
          and(
            eq(verificationItemTable.id, entity.id),
            eq(verificationItemTable.organizationId, entity.organizationId),
            eq(verificationItemTable.branchId, entity.branchId)
          )
        );

      if (existing.length > 0) {
        // Update
        await db
          .update(verificationItemTable)
          .set({
            ...row,
            updatedAt: new Date(),
          })
          .where(eq(verificationItemTable.id, entity.id));
      } else {
        // Insert
        await db
          .insert(verificationItemTable)
          .values(row);
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save VerificationItem';
      return Result.fail(message);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number,
    deletedBy: string
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(verificationItemTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(verificationItemTable.id, id),
            eq(verificationItemTable.organizationId, organizationId),
            eq(verificationItemTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
            isNull(verificationItemTable.deletedAt)
          )
        );

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete VerificationItem';
      return Result.fail(message);
    }
  }
}
