import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import type { IBankAccountRepository, BankAccountFilter } from '../../../domain/ports/output/IBankAccountRepository';
import { bankAccountsTable } from '../schemas/FinancialCategorySchema';

export class DrizzleBankAccountRepository implements IBankAccountRepository {
  async findById(id: number, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(bankAccountsTable)
      .where(
        and(
          eq(bankAccountsTable.id, id),
          eq(bankAccountsTable.organizationId, organizationId),
          isNull(bankAccountsTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findByBankAndAccount(bankCode: string, accountNumber: string, organizationId: number): Promise<unknown> {
    const rows = await db
      .select()
      .from(bankAccountsTable)
      .where(
        and(
          eq(bankAccountsTable.bankCode, bankCode),
          eq(bankAccountsTable.accountNumber, accountNumber),
          eq(bankAccountsTable.organizationId, organizationId),
          isNull(bankAccountsTable.deletedAt)
        )
      );
    return rows[0] || null;
  }

  async findMany(filter: BankAccountFilter): Promise<{ items: unknown[]; total: number }> {
    const conditions = [
      eq(bankAccountsTable.organizationId, filter.organizationId),
      isNull(bankAccountsTable.deletedAt),
    ];

    if (filter.branchId) {
      conditions.push(eq(bankAccountsTable.branchId, filter.branchId));
    }
    if (filter.bankCode) {
      conditions.push(eq(bankAccountsTable.bankCode, filter.bankCode));
    }
    if (filter.status) {
      conditions.push(eq(bankAccountsTable.status, filter.status));
    }
    if (filter.accountType) {
      conditions.push(eq(bankAccountsTable.accountType, filter.accountType));
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;

    const baseQuery = db
      .select()
      .from(bankAccountsTable)
      .where(and(...conditions))
      .orderBy(desc(bankAccountsTable.createdAt));

    const items = await queryPaginated(baseQuery, { page, pageSize });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bankAccountsTable)
      .where(and(...conditions));

    return { items, total: countResult[0]?.count || 0 };
  }

  async save(bankAccount: unknown): Promise<void> {
    await db.insert(bankAccountsTable).values(bankAccount as typeof bankAccountsTable.$inferInsert);
  }

  async update(id: number, bankAccount: unknown): Promise<void> {
    const data = bankAccount as Record<string, unknown>;
    await db
      .update(bankAccountsTable)
      .set({ ...data, updatedAt: new Date() } as typeof bankAccountsTable.$inferInsert)
      .where(eq(bankAccountsTable.id, id));
  }

  async delete(id: number, organizationId: number): Promise<void> {
    await db
      .update(bankAccountsTable)
      .set({ deletedAt: new Date() } as typeof bankAccountsTable.$inferInsert)
      .where(
        and(
          eq(bankAccountsTable.id, id),
          eq(bankAccountsTable.organizationId, organizationId)
        )
      );
  }

  async updateBalance(id: number, newBalance: number): Promise<void> {
    await db
      .update(bankAccountsTable)
      .set({ currentBalance: newBalance.toString(), updatedAt: new Date() } as typeof bankAccountsTable.$inferInsert)
      .where(eq(bankAccountsTable.id, id));
  }
}
