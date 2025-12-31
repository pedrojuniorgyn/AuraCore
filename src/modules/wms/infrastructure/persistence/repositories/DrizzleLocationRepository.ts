import { eq, and, isNull } from 'drizzle-orm';
import type { ILocationRepository } from '../../../domain/ports/ILocationRepository';
import { Location } from '../../../domain/entities/Location';
import type { LocationCode } from '../../../domain/value-objects/LocationCode';
import { LocationMapper } from '../mappers/LocationMapper';
import { wmsLocations } from '../schemas/LocationSchema';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';

export class DrizzleLocationRepository implements ILocationRepository {
  async findById(id: string, organizationId: number, branchId: number): Promise<Location | null> {
    const rows = await db
      .select()
      .from(wmsLocations)
      .where(
        and(
          eq(wmsLocations.id, id),
          eq(wmsLocations.organizationId, organizationId),
          eq(wmsLocations.branchId, branchId),
          isNull(wmsLocations.deletedAt)
        )
      )
      ;

    if (rows.length === 0) return null;

    const result = LocationMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByCode(
    code: LocationCode,
    warehouseId: string,
    organizationId: number,
    branchId: number
  ): Promise<Location | null> {
    const rows = await db
      .select()
      .from(wmsLocations)
      .where(
        and(
          eq(wmsLocations.code, code.value),
          eq(wmsLocations.warehouseId, warehouseId),
          eq(wmsLocations.organizationId, organizationId),
          eq(wmsLocations.branchId, branchId),
          isNull(wmsLocations.deletedAt)
        )
      )
      ;

    if (rows.length === 0) return null;

    const result = LocationMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByWarehouse(warehouseId: string, organizationId: number, branchId: number): Promise<Location[]> {
    const rows = await db
      .select()
      .from(wmsLocations)
      .where(
        and(
          eq(wmsLocations.warehouseId, warehouseId),
          eq(wmsLocations.organizationId, organizationId),
          eq(wmsLocations.branchId, branchId),
          isNull(wmsLocations.deletedAt)
        )
      );

    return rows
      .map(row => LocationMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findChildren(parentId: string, organizationId: number, branchId: number): Promise<Location[]> {
    const rows = await db
      .select()
      .from(wmsLocations)
      .where(
        and(
          eq(wmsLocations.parentId, parentId),
          eq(wmsLocations.organizationId, organizationId),
          eq(wmsLocations.branchId, branchId),
          isNull(wmsLocations.deletedAt)
        )
      );

    return rows
      .map(row => LocationMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findActiveByWarehouse(warehouseId: string, organizationId: number, branchId: number): Promise<Location[]> {
    const rows = await db
      .select()
      .from(wmsLocations)
      .where(
        and(
          eq(wmsLocations.warehouseId, warehouseId),
          eq(wmsLocations.isActive, true),
          eq(wmsLocations.organizationId, organizationId),
          eq(wmsLocations.branchId, branchId),
          isNull(wmsLocations.deletedAt)
        )
      );

    return rows
      .map(row => LocationMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async exists(id: string, organizationId: number, branchId: number): Promise<boolean> {
    const rows = await db
      .select({ id: wmsLocations.id })
      .from(wmsLocations)
      .where(
        and(
          eq(wmsLocations.id, id),
          eq(wmsLocations.organizationId, organizationId),
          eq(wmsLocations.branchId, branchId),
          isNull(wmsLocations.deletedAt)
        )
      )
      ;

    return rows.length > 0;
  }

  async save(location: Location): Promise<void> {
    const persistence = LocationMapper.toPersistence(location);

    const existing = await this.exists(
      location.id,
      location.organizationId,
      location.branchId
    );

    if (existing) {
      await db
        .update(wmsLocations)
        .set({
          code: persistence.code,
          name: persistence.name,
          type: persistence.type,
          parentId: persistence.parentId,
          capacity: persistence.capacity,
          capacityUnit: persistence.capacityUnit,
          isActive: persistence.isActive,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(wmsLocations.id, persistence.id),
            eq(wmsLocations.organizationId, persistence.organizationId),
            eq(wmsLocations.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(wmsLocations).values(persistence);
    }
  }

  async delete(id: string, organizationId: number, branchId: number): Promise<void> {
    await db
      .update(wmsLocations)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(wmsLocations.id, id),
          eq(wmsLocations.organizationId, organizationId),
          eq(wmsLocations.branchId, branchId)
        )
      );
  }
}

