/**
 * 💰 LIST BANK ACCOUNTS - QUERY (ARCH-013)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { bankAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IListBankAccounts,
  BankAccountOutput,
  ExecutionContext,
} from '../../domain/ports/input/IBankAccountUseCases';

@injectable()
export class ListBankAccountsUseCase implements IListBankAccounts {
  async execute(ctx: ExecutionContext): Promise<Result<BankAccountOutput[], string>> {
    const rows = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.organizationId, ctx.organizationId),
          isNull(bankAccounts.deletedAt)
        )
      )
      .orderBy(bankAccounts.name);

    const items: BankAccountOutput[] = rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      branchId: r.branchId ?? 0,
      name: r.name,
      bankCode: r.bankCode ?? null,
      bankName: r.bankName ?? null,
      agency: r.agency ?? null,
      accountNumber: r.accountNumber ?? null,
      accountType: r.accountType ?? 'CHECKING',
      initialBalance: r.initialBalance ?? '0.00',
      currentBalance: r.currentBalance ?? '0.00',
      status: r.status ?? 'ACTIVE',
    }));

    return Result.ok(items);
  }
}
