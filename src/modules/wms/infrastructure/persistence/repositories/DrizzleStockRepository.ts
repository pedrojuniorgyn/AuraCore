import { eq, and, isNull, sql, lte, isNotNull } from 'drizzle-orm';
import type { IStockRepository } from '../../../domain/ports/IStockRepository';
import { StockItem } from '../../../domain/entities/StockItem';
import { StockQuantity, UnitOfMeasure } from '../../../domain/value-objects/StockQuantity';
import { StockItemMapper } from '../mappers/StockItemMapper';
import { wmsStockItems } from '../schemas/StockItemSchema';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';

export class DrizzleStockRepository implements IStockRepository {
  async findById(id: string, organizationId: number, branchId: number): Promise<StockItem | null> {
    const rows = await db
      .select()
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.id, id),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      )
      ;

    if (rows.length === 0) return null;

    const result = StockItemMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByProductAndLocation(
    productId: string,
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<StockItem | null> {
    const rows = await db
      .select()
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.productId, productId),
          eq(wmsStockItems.locationId, locationId),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      )
      ;

    if (rows.length === 0) return null;

    const result = StockItemMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByProduct(productId: string, organizationId: number, branchId: number): Promise<StockItem[]> {
    const rows = await db
      .select()
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.productId, productId),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      );

    return rows
      .map(row => StockItemMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByLocation(locationId: string, organizationId: number, branchId: number): Promise<StockItem[]> {
    const rows = await db
      .select()
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.locationId, locationId),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      );

    return rows
      .map(row => StockItemMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findAvailableByProduct(productId: string, organizationId: number, branchId: number): Promise<StockItem[]> {
    const rows = await db
      .select()
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.productId, productId),
          sql`CAST(${wmsStockItems.quantity} AS DECIMAL(18,3)) - CAST(${wmsStockItems.reservedQuantity} AS DECIMAL(18,3)) > 0`,
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      );

    return rows
      .map(row => StockItemMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async getAvailableQuantity(productId: string, organizationId: number, branchId: number): Promise<StockQuantity> {
    const rows = await db
      .select({
        totalQty: sql<string>`SUM(CAST(${wmsStockItems.quantity} AS DECIMAL(18,3)))`,
        totalReserved: sql<string>`SUM(CAST(${wmsStockItems.reservedQuantity} AS DECIMAL(18,3)))`,
        unit: wmsStockItems.quantityUnit
      })
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.productId, productId),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      );

    if (rows.length === 0 || !rows[0].totalQty) {
      const zeroQty = StockQuantity.create(0, UnitOfMeasure.UNIT);
      return Result.isOk(zeroQty) ? zeroQty.value : StockQuantity.reconstitute(0, UnitOfMeasure.UNIT).value;
    }

    const totalQty = parseFloat(rows[0].totalQty);
    const totalReserved = parseFloat(rows[0].totalReserved || '0');
    const available = totalQty - totalReserved;

    const unit = rows[0].unit as UnitOfMeasure;
    const result = StockQuantity.create(Math.max(0, available), unit);
    return Result.isOk(result) ? result.value : StockQuantity.reconstitute(0, UnitOfMeasure.UNIT).value;
  }

  async getTotalQuantity(productId: string, organizationId: number, branchId: number): Promise<StockQuantity> {
    const rows = await db
      .select({
        totalQty: sql<string>`SUM(CAST(${wmsStockItems.quantity} AS DECIMAL(18,3)))`,
        unit: wmsStockItems.quantityUnit
      })
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.productId, productId),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      );

    if (rows.length === 0 || !rows[0].totalQty) {
      const zeroQty = StockQuantity.create(0, UnitOfMeasure.UNIT);
      return Result.isOk(zeroQty) ? zeroQty.value : StockQuantity.reconstitute(0, UnitOfMeasure.UNIT).value;
    }

    const unit = rows[0].unit as UnitOfMeasure;
    const result = StockQuantity.create(parseFloat(rows[0].totalQty), unit);
    return Result.isOk(result) ? result.value : StockQuantity.reconstitute(0, UnitOfMeasure.UNIT).value;
  }

  async findNearExpiration(days: number, organizationId: number, branchId: number): Promise<StockItem[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const rows = await db
      .select()
      .from(wmsStockItems)
      .where(
        and(
          isNotNull(wmsStockItems.expirationDate),
          lte(wmsStockItems.expirationDate, futureDate),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      );

    return rows
      .map(row => StockItemMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findExpired(organizationId: number, branchId: number): Promise<StockItem[]> {
    const now = new Date();

    const rows = await db
      .select()
      .from(wmsStockItems)
      .where(
        and(
          isNotNull(wmsStockItems.expirationDate),
          lte(wmsStockItems.expirationDate, now),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      );

    return rows
      .map(row => StockItemMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async exists(id: string, organizationId: number, branchId: number): Promise<boolean> {
    const rows = await db
      .select({ id: wmsStockItems.id })
      .from(wmsStockItems)
      .where(
        and(
          eq(wmsStockItems.id, id),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId),
          isNull(wmsStockItems.deletedAt)
        )
      )
      ;

    return rows.length > 0;
  }

  async save(stockItem: StockItem): Promise<void> {
    const persistence = StockItemMapper.toPersistence(stockItem);

    const existing = await this.exists(
      stockItem.id,
      stockItem.organizationId,
      stockItem.branchId
    );

    if (existing) {
      await db
        .update(wmsStockItems)
        .set({
          quantity: persistence.quantity,
          quantityUnit: persistence.quantityUnit,
          reservedQuantity: persistence.reservedQuantity,
          reservedQuantityUnit: persistence.reservedQuantityUnit,
          lotNumber: persistence.lotNumber,
          expirationDate: persistence.expirationDate,
          unitCostAmount: persistence.unitCostAmount,
          unitCostCurrency: persistence.unitCostCurrency,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(wmsStockItems.id, persistence.id),
            eq(wmsStockItems.organizationId, persistence.organizationId),
            eq(wmsStockItems.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(wmsStockItems).values(persistence);
    }
  }

  async delete(id: string, organizationId: number, branchId: number): Promise<void> {
    await db
      .update(wmsStockItems)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(wmsStockItems.id, id),
          eq(wmsStockItems.organizationId, organizationId),
          eq(wmsStockItems.branchId, branchId)
        )
      );
  }
}

