/**
 * DrizzleVehicleRepository - Implementação do IVehicleRepository com Drizzle ORM
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, sql, desc, like, SQL } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/db/schema';
import type { IVehicleRepository, VehicleFilter, VehicleListResult } from '../../../domain/ports/output/IVehicleRepository';
import type { Vehicle } from '../../../domain/entities/Vehicle';
import { VehicleMapper } from '../mappers/VehicleMapper';
import type { VehicleRow } from '../schemas/vehicle.schema';

// Type helper para contornar limitações de tipagem do Drizzle MSSQL
// Tipos antigos removidos - usamos inline type assertion (HOTFIX S3)

@injectable()
export class DrizzleVehicleRepository implements IVehicleRepository {
  async findById(
    id: number,
    organizationId: number
  ): Promise<Result<Vehicle | null, string>> {
    try {
      const rows = await db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, id),
            eq(vehicles.organizationId, organizationId),
            isNull(vehicles.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return VehicleMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar veículo: ${message}`);
    }
  }

  async findByPlate(
    plate: string,
    organizationId: number
  ): Promise<Result<Vehicle | null, string>> {
    try {
      const normalizedPlate = plate.toUpperCase().replace(/-/g, '');

      const rows = await db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.plate, normalizedPlate),
            eq(vehicles.organizationId, organizationId),
            isNull(vehicles.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return VehicleMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar veículo por placa: ${message}`);
    }
  }

  async findMany(filter: VehicleFilter): Promise<Result<VehicleListResult, string>> {
    try {
      const page = filter.page ?? 1;
      const pageSize = filter.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: SQL[] = [
        eq(vehicles.organizationId, filter.organizationId),
        isNull(vehicles.deletedAt),
      ];

      if (filter.branchId) {
        conditions.push(eq(vehicles.branchId, filter.branchId));
      }
      if (filter.status) {
        conditions.push(eq(vehicles.status, filter.status));
      }
      if (filter.type) {
        conditions.push(eq(vehicles.type, filter.type.toUpperCase()));
      }
      if (filter.plate) {
        const normalizedPlate = filter.plate.toUpperCase().replace(/-/g, '');
        conditions.push(like(vehicles.plate, `%${normalizedPlate}%`));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vehicles)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count ?? 0);

      // Get paginated results
      const query = db
        .select()
        .from(vehicles)
        .where(and(...conditions))
        .orderBy(vehicles.plate);
      
      // Usar .offset().fetch() ao invés de .limit() (Drizzle MSSQL não suporta .limit() em runtime)
      const rows = await query.offset(offset).fetch(pageSize);

      // Map to domain entities
      const items: Vehicle[] = [];
      for (const row of rows) {
        const vehicleResult = VehicleMapper.toDomain(row);
        if (Result.isOk(vehicleResult)) {
          items.push(vehicleResult.value);
        }
      }

      return Result.ok({
        items,
        total,
        page,
        pageSize,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao listar veículos: ${message}`);
    }
  }

  async findAvailable(
    organizationId: number,
    branchId: number
  ): Promise<Result<Vehicle[], string>> {
    try {
      const rows = await db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.organizationId, organizationId),
            eq(vehicles.branchId, branchId),
            eq(vehicles.status, 'AVAILABLE'),
            isNull(vehicles.deletedAt)
          )
        )
        .orderBy(vehicles.plate);

      const items: Vehicle[] = [];
      for (const row of rows) {
        const vehicleResult = VehicleMapper.toDomain(row);
        if (Result.isOk(vehicleResult)) {
          items.push(vehicleResult.value);
        }
      }

      return Result.ok(items);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar veículos disponíveis: ${message}`);
    }
  }

  async save(vehicle: Vehicle): Promise<Result<number, string>> {
    try {
      const data = VehicleMapper.toPersistence(vehicle);

      if (vehicle.id === 0) {
        // Insert
        await db.insert(vehicles).values(data);
        
        // Buscar ID gerado
        const result = await db
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.plate, vehicle.plate),
              eq(vehicles.organizationId, vehicle.organizationId)
            )
          )
          .orderBy(desc(vehicles.id));
        
        return Result.ok(result[0]?.id ?? 0);
      } else {
        // Update
        await db
          .update(vehicles)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(vehicles.id, vehicle.id));

        return Result.ok(vehicle.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao salvar veículo: ${message}`);
    }
  }

  async delete(
    id: number,
    organizationId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(vehicles)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(vehicles.id, id),
            eq(vehicles.organizationId, organizationId)
          )
        );

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao deletar veículo: ${message}`);
    }
  }
}
