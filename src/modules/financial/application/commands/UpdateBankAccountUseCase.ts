/**
 * 💰 UPDATE BANK ACCOUNT - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { bankAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IUpdateBankAccount,
  UpdateBankAccountInput,
  BankAccountOutput,
  ExecutionContext,
} from '../../domain/ports/input/IBankAccountUseCases';

@injectable()
export class UpdateBankAccountUseCase implements IUpdateBankAccount {
  async execute(
    input: UpdateBankAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<BankAccountOutput, string>> {
    const existing = await db
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, input.id),
          eq(bankAccounts.organizationId, ctx.organizationId),
          isNull(bankAccounts.deletedAt)
        )
      );

    if (existing.length === 0) {
      return Result.fail(`Conta bancária #${input.id} não encontrada`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.bankCode !== undefined) updateData.bankCode = input.bankCode;
    if (input.bankName !== undefined) updateData.bankName = input.bankName;
    if (input.agency !== undefined) updateData.agency = input.agency;
    if (input.accountNumber !== undefined) updateData.accountNumber = input.accountNumber;
    if (input.status !== undefined) updateData.status = input.status;

    await db
      .update(bankAccounts)
      .set(updateData)
      .where(
        and(
          eq(bankAccounts.id, input.id),
          eq(bankAccounts.organizationId, ctx.organizationId)
        )
      );

    const rows = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, input.id),
          eq(bankAccounts.organizationId, ctx.organizationId)
        )
      );

    const row = rows[0];
    return Result.ok({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId ?? 0,
      name: row.name,
      bankCode: row.bankCode ?? null,
      bankName: row.bankName ?? null,
      agency: row.agency ?? null,
      accountNumber: row.accountNumber ?? null,
      accountType: row.accountType ?? 'CHECKING',
      initialBalance: row.initialBalance ?? '0.00',
      currentBalance: row.currentBalance ?? '0.00',
      status: row.status ?? 'ACTIVE',
    });
  }
}
