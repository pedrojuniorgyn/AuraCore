import { eq, and, isNull, gte, lte, or } from 'drizzle-orm';
import type { IMovementRepository } from '../../../domain/ports/IMovementRepository';
import { StockMovement } from '../../../domain/entities/StockMovement';
import type { MovementType } from '../../../domain/value-objects/MovementType';
import { StockMovementMapper } from '../mappers/StockMovementMapper';
import { wmsStockMovements } from '../schemas/StockMovementSchema';
import { db } from '@/lib/db';
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
}

