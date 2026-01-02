import { eq, and, isNull, gte, lte, or, desc, sql } from 'drizzle-orm';
import type { IMovementRepository } from '../../../domain/ports/IMovementRepository';
import { StockMovement } from '../../../domain/entities/StockMovement';
import type { MovementType } from '../../../domain/value-objects/MovementType';
import { StockMovementMapper } from '../mappers/StockMovementMapper';
import { wmsStockMovements } from '../schemas/StockMovementSchema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';

export class DrizzleMovementRepository implements IMovementRepository {
  async findById(id: string, organizationId: number, branchId: number): Promise<StockMovement | null> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.id, id),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      )
      ;

    if (rows.length === 0) return null;

    const result = StockMovementMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByProduct(productId: string, organizationId: number, branchId: number): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.productId, productId),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByLocation(locationId: string, organizationId: number, branchId: number): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          or(
            eq(wmsStockMovements.fromLocationId, locationId),
            eq(wmsStockMovements.toLocationId, locationId)
          ),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    organizationId: number,
    branchId: number
  ): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          gte(wmsStockMovements.executedAt, startDate),
          lte(wmsStockMovements.executedAt, endDate),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByType(type: MovementType, organizationId: number, branchId: number): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.type, type.value),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByReference(
    referenceType: string,
    referenceId: string,
    organizationId: number,
    branchId: number
  ): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.referenceType, referenceType),
          eq(wmsStockMovements.referenceId, referenceId),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findEntriesByProduct(productId: string, organizationId: number, branchId: number): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.productId, productId),
          eq(wmsStockMovements.type, 'ENTRY'),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findExitsByProduct(productId: string, organizationId: number, branchId: number): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.productId, productId),
          eq(wmsStockMovements.type, 'EXIT'),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByUser(userId: string, organizationId: number, branchId: number): Promise<StockMovement[]> {
    const rows = await db
      .select()
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.executedBy, userId),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      );

    return rows
      .map(row => StockMovementMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async exists(id: string, organizationId: number, branchId: number): Promise<boolean> {
    const rows = await db
      .select({ id: wmsStockMovements.id })
      .from(wmsStockMovements)
      .where(
        and(
          eq(wmsStockMovements.id, id),
          eq(wmsStockMovements.organizationId, organizationId),
          eq(wmsStockMovements.branchId, branchId),
          isNull(wmsStockMovements.deletedAt)
        )
      )
      ;

    return rows.length > 0;
  }

  async save(movement: StockMovement): Promise<void> {
    const persistence = StockMovementMapper.toPersistence(movement);

    const existing = await this.exists(
      movement.id,
      movement.organizationId,
      movement.branchId
    );

    if (!existing) {
      await db.insert(wmsStockMovements).values(persistence);
    }
  }

  /**
   * Lista movimentações com paginação e filtros
   * E7.8 WMS Semana 3
   */
  async findMany(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { page: number; limit: number }
  ): Promise<StockMovement[]> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(wmsStockMovements.organizationId, organizationId),
      eq(wmsStockMovements.branchId, branchId),
      isNull(wmsStockMovements.deletedAt)
    ];

    if (filters.productId) {
      conditions.push(eq(wmsStockMovements.productId, filters.productId));
    }
    if (filters.type) {
      conditions.push(eq(wmsStockMovements.type, filters.type));
    }
    if (filters.startDate) {
      conditions.push(gte(wmsStockMovements.executedAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(wmsStockMovements.executedAt, filters.endDate));
    }

    // Location filter handled separately due to OR condition
    let locationCondition: any = null;
    if (filters.locationId) {
      locationCondition = or(
        eq(wmsStockMovements.fromLocationId, filters.locationId),
        eq(wmsStockMovements.toLocationId, filters.locationId)
      );
    }

    // Build final where clause
    const whereClause = locationCondition 
      ? and(...conditions, locationCondition)
      : (conditions.length > 1 ? and(...conditions) : conditions[0]);

    // Get paginated items (MS SQL Server pagination)
    const query = db
      .select()
      .from(wmsStockMovements)
      .where(whereClause)
      .orderBy(desc(wmsStockMovements.executedAt));
    
    const records = await queryPaginated<typeof wmsStockMovements.$inferSelect>(
      query,
      { page, pageSize: limit }
    );

    // Map to domain
    return records
      .map((record: any) => StockMovementMapper.toDomain(record))
      .filter((result: any) => Result.isOk(result))
      .map((r: any) => r.value);
  }

  /**
   * Conta movimentações com filtros
   * E7.8 WMS Semana 3
   */
  async count(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<number> {
    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(wmsStockMovements.organizationId, organizationId),
      eq(wmsStockMovements.branchId, branchId),
      isNull(wmsStockMovements.deletedAt)
    ];

    if (filters.productId) {
      conditions.push(eq(wmsStockMovements.productId, filters.productId));
    }
    if (filters.type) {
      conditions.push(eq(wmsStockMovements.type, filters.type));
    }
    if (filters.startDate) {
      conditions.push(gte(wmsStockMovements.executedAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(wmsStockMovements.executedAt, filters.endDate));
    }

    // Location filter handled separately due to OR condition
    let locationCondition: any = null;
    if (filters.locationId) {
      locationCondition = or(
        eq(wmsStockMovements.fromLocationId, filters.locationId),
        eq(wmsStockMovements.toLocationId, filters.locationId)
      );
    }

    // Build final where clause
    const whereClause = locationCondition 
      ? and(...conditions, locationCondition)
      : (conditions.length > 1 ? and(...conditions) : conditions[0]);

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(wmsStockMovements)
      .where(whereClause);

    return Number(result[0]?.count ?? 0);
  }
}

