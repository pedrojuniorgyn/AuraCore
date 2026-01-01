import { eq, and, isNull } from 'drizzle-orm';
import type { IInventoryCountRepository } from '../../../domain/ports/IInventoryCountRepository';
import { InventoryCount } from '../../../domain/entities/InventoryCount';
import { InventoryCountMapper } from '../mappers/InventoryCountMapper';
import { wmsInventoryCounts } from '../schemas/InventoryCountSchema';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';

export class DrizzleInventoryCountRepository implements IInventoryCountRepository {
  async findById(id: string, organizationId: number, branchId: number): Promise<InventoryCount | null> {
    const rows = await db
      .select()
      .from(wmsInventoryCounts)
      .where(
        and(
          eq(wmsInventoryCounts.id, id),
          eq(wmsInventoryCounts.organizationId, organizationId),
          eq(wmsInventoryCounts.branchId, branchId),
          isNull(wmsInventoryCounts.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = InventoryCountMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByProductAndLocation(
    productId: string,
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount | null> {
    const rows = await db
      .select()
      .from(wmsInventoryCounts)
      .where(
        and(
          eq(wmsInventoryCounts.productId, productId),
          eq(wmsInventoryCounts.locationId, locationId),
          eq(wmsInventoryCounts.organizationId, organizationId),
          eq(wmsInventoryCounts.branchId, branchId),
          isNull(wmsInventoryCounts.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = InventoryCountMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  /**
   * Bug 13 Fix: Encontrar contagem pendente para produto/localização específicos
   * Usado para evitar duplicação em requisições concorrentes
   */
  async findPendingByProductAndLocation(
    productId: string,
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount | null> {
    const rows = await db
      .select()
      .from(wmsInventoryCounts)
      .where(
        and(
          eq(wmsInventoryCounts.productId, productId),
          eq(wmsInventoryCounts.locationId, locationId),
          eq(wmsInventoryCounts.status, 'PENDING'),
          eq(wmsInventoryCounts.organizationId, organizationId),
          eq(wmsInventoryCounts.branchId, branchId),
          isNull(wmsInventoryCounts.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = InventoryCountMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findPendingByLocation(
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount[]> {
    const rows = await db
      .select()
      .from(wmsInventoryCounts)
      .where(
        and(
          eq(wmsInventoryCounts.locationId, locationId),
          eq(wmsInventoryCounts.status, 'PENDING'),
          eq(wmsInventoryCounts.organizationId, organizationId),
          eq(wmsInventoryCounts.branchId, branchId),
          isNull(wmsInventoryCounts.deletedAt)
        )
      );

    return rows
      .map(row => InventoryCountMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByStatus(
    status: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount[]> {
    const rows = await db
      .select()
      .from(wmsInventoryCounts)
      .where(
        and(
          eq(wmsInventoryCounts.status, status),
          eq(wmsInventoryCounts.organizationId, organizationId),
          eq(wmsInventoryCounts.branchId, branchId),
          isNull(wmsInventoryCounts.deletedAt)
        )
      );

    return rows
      .map(row => InventoryCountMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async save(inventoryCount: InventoryCount): Promise<void> {
    const persistence = InventoryCountMapper.toPersistence(inventoryCount);

    const existing = await db
      .select({ id: wmsInventoryCounts.id })
      .from(wmsInventoryCounts)
      .where(
        and(
          eq(wmsInventoryCounts.id, persistence.id),
          eq(wmsInventoryCounts.organizationId, persistence.organizationId),
          eq(wmsInventoryCounts.branchId, persistence.branchId)
        )
      );

    if (existing.length > 0) {
      await db
        .update(wmsInventoryCounts)
        .set({
          systemQuantity: persistence.systemQuantity,
          systemQuantityUnit: persistence.systemQuantityUnit,
          countedQuantity: persistence.countedQuantity,
          countedQuantityUnit: persistence.countedQuantityUnit,
          status: persistence.status,
          countedBy: persistence.countedBy,
          countedAt: persistence.countedAt,
          adjustmentMovementId: persistence.adjustmentMovementId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(wmsInventoryCounts.id, persistence.id),
            eq(wmsInventoryCounts.organizationId, persistence.organizationId),
            eq(wmsInventoryCounts.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(wmsInventoryCounts).values(persistence);
    }
  }

  async delete(id: string, organizationId: number, branchId: number): Promise<void> {
    await db
      .update(wmsInventoryCounts)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(wmsInventoryCounts.id, id),
          eq(wmsInventoryCounts.organizationId, organizationId),
          eq(wmsInventoryCounts.branchId, branchId)
        )
      );
  }
}

