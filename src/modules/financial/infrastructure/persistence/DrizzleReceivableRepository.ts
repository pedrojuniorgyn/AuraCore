/**
 * DrizzleReceivableRepository - Implementação do IReceivableRepository com Drizzle ORM
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, sql, desc, gte, lte, lt, SQL } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import type { 
  IReceivableRepository, 
  ReceivableFilter, 
  ReceivableListResult,
  ReceivableSummary 
} from '../../domain/ports/output/IReceivableRepository';
import type { AccountReceivable } from '../../domain/entities/AccountReceivable';
import { accountsReceivableTable, type AccountReceivableRow } from './ReceivableSchema';
import { ReceivableMapper } from './ReceivableMapper';

// Type helper para contornar limitações de tipagem do Drizzle MSSQL
type QueryWithLimit = { limit: (n: number) => Promise<AccountReceivableRow[]> };
type QueryWithOffset = { offset: (n: number) => QueryWithLimit };

@injectable()
export class DrizzleReceivableRepository implements IReceivableRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<AccountReceivable | null, string>> {
    try {
      const rows = await db
        .select()
        .from(accountsReceivableTable)
        .where(
          and(
            eq(accountsReceivableTable.id, id),
            eq(accountsReceivableTable.organizationId, organizationId),
            eq(accountsReceivableTable.branchId, branchId),
            isNull(accountsReceivableTable.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return ReceivableMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar conta a receber: ${message}`);
    }
  }

  async findByDocumentNumber(
    documentNumber: string,
    organizationId: number
  ): Promise<Result<AccountReceivable | null, string>> {
    try {
      const rows = await db
        .select()
        .from(accountsReceivableTable)
        .where(
          and(
            eq(accountsReceivableTable.documentNumber, documentNumber),
            eq(accountsReceivableTable.organizationId, organizationId),
            isNull(accountsReceivableTable.deletedAt)
          )
        );

      const row = rows[0];
      if (!row) {
        return Result.ok(null);
      }

      return ReceivableMapper.toDomain(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar por documento: ${message}`);
    }
  }

  async findMany(filter: ReceivableFilter): Promise<Result<ReceivableListResult, string>> {
    try {
      const page = filter.page ?? 1;
      const pageSize = filter.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: SQL[] = [
        eq(accountsReceivableTable.organizationId, filter.organizationId),
        eq(accountsReceivableTable.branchId, filter.branchId),
        isNull(accountsReceivableTable.deletedAt),
      ];

      if (filter.status) {
        conditions.push(eq(accountsReceivableTable.status, filter.status));
      }
      if (filter.customerId) {
        conditions.push(eq(accountsReceivableTable.customerId, filter.customerId));
      }
      if (filter.dueDateFrom) {
        conditions.push(gte(accountsReceivableTable.dueDate, filter.dueDateFrom));
      }
      if (filter.dueDateTo) {
        conditions.push(lte(accountsReceivableTable.dueDate, filter.dueDateTo));
      }
      if (filter.overdueOnly) {
        conditions.push(lt(accountsReceivableTable.dueDate, new Date()));
        conditions.push(eq(accountsReceivableTable.status, 'OPEN'));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(accountsReceivableTable)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count ?? 0);

      // Get paginated results
      const query = db
        .select()
        .from(accountsReceivableTable)
        .where(and(...conditions))
        .orderBy(desc(accountsReceivableTable.dueDate));

      const rows = await (query as unknown as QueryWithOffset).offset(offset).limit(pageSize);

      // Map to domain entities
      const items: AccountReceivable[] = [];
      for (const row of rows) {
        const receivableResult = ReceivableMapper.toDomain(row);
        if (Result.isOk(receivableResult)) {
          items.push(receivableResult.value);
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
      return Result.fail(`Erro ao listar contas a receber: ${message}`);
    }
  }

  async findByCustomer(
    customerId: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<AccountReceivable[], string>> {
    try {
      const rows = await db
        .select()
        .from(accountsReceivableTable)
        .where(
          and(
            eq(accountsReceivableTable.customerId, customerId),
            eq(accountsReceivableTable.organizationId, organizationId),
            eq(accountsReceivableTable.branchId, branchId),
            isNull(accountsReceivableTable.deletedAt)
          )
        )
        .orderBy(desc(accountsReceivableTable.dueDate));

      const items: AccountReceivable[] = [];
      for (const row of rows) {
        const receivableResult = ReceivableMapper.toDomain(row);
        if (Result.isOk(receivableResult)) {
          items.push(receivableResult.value);
        }
      }

      return Result.ok(items);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar por cliente: ${message}`);
    }
  }

  async getSummary(
    organizationId: number,
    branchId: number
  ): Promise<Result<ReceivableSummary, string>> {
    try {
      const summaryResult = await db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
          totalReceived: sql<number>`COALESCE(SUM(amount_received), 0)`,
          totalPending: sql<number>`COALESCE(SUM(amount - amount_received), 0)`,
          overdueCount: sql<number>`SUM(CASE WHEN due_date < GETDATE() AND status = 'OPEN' THEN 1 ELSE 0 END)`,
        })
        .from(accountsReceivableTable)
        .where(
          and(
            eq(accountsReceivableTable.organizationId, organizationId),
            eq(accountsReceivableTable.branchId, branchId),
            isNull(accountsReceivableTable.deletedAt)
          )
        );

      const summary = summaryResult[0];

      return Result.ok({
        totalAmount: Number(summary?.totalAmount ?? 0),
        totalReceived: Number(summary?.totalReceived ?? 0),
        totalPending: Number(summary?.totalPending ?? 0),
        overdueCount: Number(summary?.overdueCount ?? 0),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao obter resumo: ${message}`);
    }
  }

  async save(receivable: AccountReceivable): Promise<Result<void, string>> {
    try {
      const data = ReceivableMapper.toPersistence(receivable);

      // Check if exists
      const existing = await db
        .select({ id: accountsReceivableTable.id })
        .from(accountsReceivableTable)
        .where(eq(accountsReceivableTable.id, receivable.id));

      if (existing.length > 0) {
        // Update
        await db
          .update(accountsReceivableTable)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(accountsReceivableTable.id, receivable.id));
      } else {
        // Insert
        await db.insert(accountsReceivableTable).values(data);
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao salvar conta a receber: ${message}`);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(accountsReceivableTable)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(accountsReceivableTable.id, id),
            eq(accountsReceivableTable.organizationId, organizationId),
            eq(accountsReceivableTable.branchId, branchId)
          )
        );

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao deletar conta a receber: ${message}`);
    }
  }
}
