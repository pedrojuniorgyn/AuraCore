/**
 * DrizzleTripRepository - Implementação do ITripRepository com Drizzle ORM
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, sql, desc, gte, lte, SQL } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { trips } from '@/lib/db/schema';
import type { ITripRepository, TripFilter, TripListResult } from '../../../domain/ports/output/ITripRepository';
import type { Trip } from '../../../domain/entities/Trip';
import type { TripStatusType } from '../../../domain/value-objects/TripStatus';
import { TripMapper } from '../mappers/TripMapper';
import type { TripRow } from '../schemas/trip.schema';

// Type helper para contornar limitações de tipagem do Drizzle MSSQL
// Tipos antigos removidos - usamos inline type assertion (HOTFIX S3)

@injectable()
export class DrizzleTripRepository implements ITripRepository {
  async findById(
    id: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<Trip | null, string>> {
    try {
      const rows = await db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.id, id),
            eq(trips.organizationId, organizationId),
            eq(trips.branchId, branchId),
            isNull(trips.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return TripMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar viagem: ${message}`);
    }
  }

  async findByTripNumber(
    tripNumber: string,
    organizationId: number
  ): Promise<Result<Trip | null, string>> {
    try {
      const rows = await db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.tripNumber, tripNumber),
            eq(trips.organizationId, organizationId),
            isNull(trips.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return TripMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar viagem por número: ${message}`);
    }
  }

  async findMany(filter: TripFilter): Promise<Result<TripListResult, string>> {
    try {
      const page = filter.page ?? 1;
      const pageSize = filter.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: SQL[] = [
        eq(trips.organizationId, filter.organizationId),
        eq(trips.branchId, filter.branchId),
        isNull(trips.deletedAt),
      ];

      if (filter.status) {
        conditions.push(eq(trips.status, filter.status));
      }
      if (filter.driverId) {
        conditions.push(eq(trips.driverId, filter.driverId));
      }
      if (filter.vehicleId) {
        conditions.push(eq(trips.vehicleId, filter.vehicleId));
      }
      if (filter.startDateFrom) {
        conditions.push(gte(trips.scheduledStart, filter.startDateFrom));
      }
      if (filter.startDateTo) {
        conditions.push(lte(trips.scheduledStart, filter.startDateTo));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(trips)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count ?? 0);

      // Get paginated results
      const query = db
        .select()
        .from(trips)
        .where(and(...conditions))
        .orderBy(desc(trips.createdAt));
      
      // CRÍTICO: .limit() DEVE vir ANTES de .offset() no Drizzle ORM (HOTFIX S3)
      type QueryWithLimitOffset = { limit(n: number): { offset(n: number): Promise<typeof trips.$inferSelect[]> } };
      const rows = await (query as unknown as QueryWithLimitOffset).limit(pageSize).offset(offset);

      // Map to domain entities
      const items: Trip[] = [];
      for (const row of rows) {
        const tripResult = TripMapper.toDomain(row);
        if (Result.isOk(tripResult)) {
          items.push(tripResult.value);
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
      return Result.fail(`Erro ao listar viagens: ${message}`);
    }
  }

  async findByDriver(
    driverId: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<Trip[], string>> {
    try {
      const rows = await db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.driverId, driverId),
            eq(trips.organizationId, organizationId),
            eq(trips.branchId, branchId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(desc(trips.createdAt));

      const items: Trip[] = [];
      for (const row of rows) {
        const tripResult = TripMapper.toDomain(row);
        if (Result.isOk(tripResult)) {
          items.push(tripResult.value);
        }
      }

      return Result.ok(items);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar viagens do motorista: ${message}`);
    }
  }

  async findByVehicle(
    vehicleId: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<Trip[], string>> {
    try {
      const rows = await db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.vehicleId, vehicleId),
            eq(trips.organizationId, organizationId),
            eq(trips.branchId, branchId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(desc(trips.createdAt));

      const items: Trip[] = [];
      for (const row of rows) {
        const tripResult = TripMapper.toDomain(row);
        if (Result.isOk(tripResult)) {
          items.push(tripResult.value);
        }
      }

      return Result.ok(items);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar viagens do veículo: ${message}`);
    }
  }

  async save(trip: Trip): Promise<Result<number, string>> {
    try {
      const data = TripMapper.toPersistence(trip);

      if (trip.id === 0) {
        // Insert
        await db.insert(trips).values(data);
        
        // Buscar ID gerado
        const result = await db
          .select({ id: trips.id })
          .from(trips)
          .where(
            and(
              eq(trips.tripNumber, trip.tripNumber),
              eq(trips.organizationId, trip.organizationId)
            )
          );
        
        return Result.ok(result[0]?.id ?? 0);
      } else {
        // Update
        await db
          .update(trips)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(trips.id, trip.id));

        return Result.ok(trip.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao salvar viagem: ${message}`);
    }
  }

  async delete(
    id: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(trips)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(trips.id, id),
            eq(trips.organizationId, organizationId),
            eq(trips.branchId, branchId)
          )
        );

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao deletar viagem: ${message}`);
    }
  }

  async countByStatus(
    organizationId: number,
    branchId: number,
    status: TripStatusType
  ): Promise<Result<number, string>> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(trips)
        .where(
          and(
            eq(trips.organizationId, organizationId),
            eq(trips.branchId, branchId),
            eq(trips.status, status),
            isNull(trips.deletedAt)
          )
        );

      return Result.ok(Number(result[0]?.count ?? 0));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao contar viagens: ${message}`);
    }
  }
}
