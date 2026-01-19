/**
 * DrizzleDriverRepository - Implementação do IDriverRepository com Drizzle ORM
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, sql, desc, like, SQL } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { drivers } from '@/lib/db/schema';
import type { IDriverRepository, DriverFilter, DriverListResult } from '../../../domain/ports/output/IDriverRepository';
import type { Driver } from '../../../domain/entities/Driver';
import { DriverMapper } from '../mappers/DriverMapper';
import type { DriverRow } from '../schemas/driver.schema';

// Type helper para contornar limitações de tipagem do Drizzle MSSQL
type QueryWithLimit = { limit: (n: number) => Promise<DriverRow[]> };
type QueryWithOffset = { offset: (n: number) => QueryWithLimit };

@injectable()
export class DrizzleDriverRepository implements IDriverRepository {
  async findById(
    id: number,
    organizationId: number
  ): Promise<Result<Driver | null, string>> {
    try {
      const rows = await db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.id, id),
            eq(drivers.organizationId, organizationId),
            isNull(drivers.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return DriverMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar motorista: ${message}`);
    }
  }

  async findByCpf(
    cpf: string,
    organizationId: number
  ): Promise<Result<Driver | null, string>> {
    try {
      const normalizedCpf = cpf.replace(/\D/g, '');

      const rows = await db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.cpf, normalizedCpf),
            eq(drivers.organizationId, organizationId),
            isNull(drivers.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return DriverMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar motorista por CPF: ${message}`);
    }
  }

  async findMany(filter: DriverFilter): Promise<Result<DriverListResult, string>> {
    try {
      const page = filter.page ?? 1;
      const pageSize = filter.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: SQL[] = [
        eq(drivers.organizationId, filter.organizationId),
        isNull(drivers.deletedAt),
      ];

      if (filter.branchId) {
        conditions.push(eq(drivers.branchId, filter.branchId));
      }
      if (filter.status) {
        conditions.push(eq(drivers.status, filter.status));
      }
      if (filter.name) {
        conditions.push(like(drivers.name, `%${filter.name}%`));
      }
      if (filter.cpf) {
        const normalizedCpf = filter.cpf.replace(/\D/g, '');
        conditions.push(eq(drivers.cpf, normalizedCpf));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(drivers)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count ?? 0);

      // Get paginated results
      const query = db
        .select()
        .from(drivers)
        .where(and(...conditions))
        .orderBy(drivers.name);
      
      const rows = await (query as unknown as QueryWithOffset).offset(offset).limit(pageSize);

      // Map to domain entities
      const items: Driver[] = [];
      for (const row of rows) {
        const driverResult = DriverMapper.toDomain(row);
        if (Result.isOk(driverResult)) {
          items.push(driverResult.value);
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
      return Result.fail(`Erro ao listar motoristas: ${message}`);
    }
  }

  async findActive(
    organizationId: number,
    branchId: number
  ): Promise<Result<Driver[], string>> {
    try {
      const rows = await db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.organizationId, organizationId),
            eq(drivers.branchId, branchId),
            eq(drivers.status, 'ACTIVE'),
            isNull(drivers.deletedAt)
          )
        )
        .orderBy(drivers.name);

      const items: Driver[] = [];
      for (const row of rows) {
        const driverResult = DriverMapper.toDomain(row);
        if (Result.isOk(driverResult)) {
          items.push(driverResult.value);
        }
      }

      return Result.ok(items);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar motoristas ativos: ${message}`);
    }
  }

  async save(driver: Driver): Promise<Result<number, string>> {
    try {
      const data = DriverMapper.toPersistence(driver);

      if (driver.id === 0) {
        // Insert
        await db.insert(drivers).values(data);
        
        // Buscar ID gerado
        const result = await db
          .select({ id: drivers.id })
          .from(drivers)
          .where(
            and(
              eq(drivers.cpf, driver.cpf),
              eq(drivers.organizationId, driver.organizationId)
            )
          )
          .orderBy(desc(drivers.id));
        
        return Result.ok(result[0]?.id ?? 0);
      } else {
        // Update
        await db
          .update(drivers)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(drivers.id, driver.id));

        return Result.ok(driver.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao salvar motorista: ${message}`);
    }
  }

  async delete(
    id: number,
    organizationId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(drivers)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(drivers.id, id),
            eq(drivers.organizationId, organizationId)
          )
        );

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao deletar motorista: ${message}`);
    }
  }
}
