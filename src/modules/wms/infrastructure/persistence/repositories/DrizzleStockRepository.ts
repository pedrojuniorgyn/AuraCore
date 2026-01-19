import { eq, and, isNull, sql, lte, isNotNull, desc } from 'drizzle-orm';
import type { IStockRepository } from '../../../domain/ports/output/IStockRepository';
import { StockItem } from '../../../domain/entities/StockItem';
import { StockQuantity, UnitOfMeasure } from '../../../domain/value-objects/StockQuantity';
import { StockItemMapper } from '../mappers/StockItemMapper';
import { wmsStockItems } from '../schemas/StockItemSchema';
import { wmsLocations } from '../schemas/LocationSchema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
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

  /**
   * Lista itens de estoque com paginação e filtros
   * E7.8 WMS Semana 3
   */
  async findMany(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      warehouseId?: string;
      minQuantity?: number;
      hasStock?: boolean;
      lotNumber?: string;
      expired?: boolean;
    },
    pagination: { page: number; limit: number }
  ): Promise<StockItem[]> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(wmsStockItems.organizationId, organizationId),
      eq(wmsStockItems.branchId, branchId),
      isNull(wmsStockItems.deletedAt)
    ];

    if (filters.productId) {
      conditions.push(eq(wmsStockItems.productId, filters.productId));
    }
    if (filters.locationId) {
      conditions.push(eq(wmsStockItems.locationId, filters.locationId));
    }
    if (filters.warehouseId) {
      // Filter by warehouseId using subquery (StockItem -> Location -> Warehouse)
      conditions.push(sql`${wmsStockItems.locationId} IN (
        SELECT id FROM wms_locations 
        WHERE warehouse_id = ${filters.warehouseId}
          AND organization_id = ${organizationId}
          AND branch_id = ${branchId}
          AND deleted_at IS NULL
      )`);
    }
    if (filters.lotNumber) {
      conditions.push(eq(wmsStockItems.lotNumber, filters.lotNumber));
    }
    // Bug Fix (Etapa 2.5): Use !== undefined for boolean filters to distinguish false from undefined
    if (filters.hasStock !== undefined) {
      if (filters.hasStock) {
        // hasStock=true → quantity > 0
        conditions.push(sql`CAST(${wmsStockItems.quantity} AS DECIMAL) > 0`);
      } else {
        // hasStock=false → quantity = 0 or <= 0
        conditions.push(sql`CAST(${wmsStockItems.quantity} AS DECIMAL) <= 0`);
      }
    }
    if (filters.minQuantity !== undefined) {
      conditions.push(sql`CAST(${wmsStockItems.quantity} AS DECIMAL) >= ${filters.minQuantity}`);
    }
    if (filters.expired !== undefined) {
      if (filters.expired) {
        // expired=true → expirationDate < now
        conditions.push(sql`${wmsStockItems.expirationDate} < GETDATE()`);
      } else {
        // expired=false → expirationDate >= now OR expirationDate IS NULL
        conditions.push(sql`(${wmsStockItems.expirationDate} >= GETDATE() OR ${wmsStockItems.expirationDate} IS NULL)`);
      }
    }

    // Get paginated items (MS SQL Server pagination)
    const query = db
      .select()
      .from(wmsStockItems)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(wmsStockItems.createdAt));
    
    const records = await queryPaginated<typeof wmsStockItems.$inferSelect>(
      query,
      { page, pageSize: limit }
    );

    // Map to domain
    return records
      .map((record) => StockItemMapper.toDomain(record))
      .filter(Result.isOk)
      .map((r) => r.value as StockItem);
  }

  /**
   * Conta itens de estoque com filtros
   * E7.8 WMS Semana 3
   */
  async count(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      warehouseId?: string;
      minQuantity?: number;
      hasStock?: boolean;
      lotNumber?: string;
      expired?: boolean;
    }
  ): Promise<number> {
    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(wmsStockItems.organizationId, organizationId),
      eq(wmsStockItems.branchId, branchId),
      isNull(wmsStockItems.deletedAt)
    ];

    if (filters.productId) {
      conditions.push(eq(wmsStockItems.productId, filters.productId));
    }
    if (filters.locationId) {
      conditions.push(eq(wmsStockItems.locationId, filters.locationId));
    }
    if (filters.warehouseId) {
      // Filter by warehouseId using subquery (StockItem -> Location -> Warehouse)
      conditions.push(sql`${wmsStockItems.locationId} IN (
        SELECT id FROM wms_locations 
        WHERE warehouse_id = ${filters.warehouseId}
          AND organization_id = ${organizationId}
          AND branch_id = ${branchId}
          AND deleted_at IS NULL
      )`);
    }
    if (filters.lotNumber) {
      conditions.push(eq(wmsStockItems.lotNumber, filters.lotNumber));
    }
    // Bug Fix (Etapa 2.5): Use !== undefined for boolean filters to distinguish false from undefined
    if (filters.hasStock !== undefined) {
      if (filters.hasStock) {
        // hasStock=true → quantity > 0
        conditions.push(sql`CAST(${wmsStockItems.quantity} AS DECIMAL) > 0`);
      } else {
        // hasStock=false → quantity = 0 or <= 0
        conditions.push(sql`CAST(${wmsStockItems.quantity} AS DECIMAL) <= 0`);
      }
    }
    if (filters.minQuantity !== undefined) {
      conditions.push(sql`CAST(${wmsStockItems.quantity} AS DECIMAL) >= ${filters.minQuantity}`);
    }
    if (filters.expired !== undefined) {
      if (filters.expired) {
        // expired=true → expirationDate < now
        conditions.push(sql`${wmsStockItems.expirationDate} < GETDATE()`);
      } else {
        // expired=false → expirationDate >= now OR expirationDate IS NULL
        conditions.push(sql`(${wmsStockItems.expirationDate} >= GETDATE() OR ${wmsStockItems.expirationDate} IS NULL)`);
      }
    }

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(wmsStockItems)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    return Number(result[0]?.count ?? 0);
  }
}

