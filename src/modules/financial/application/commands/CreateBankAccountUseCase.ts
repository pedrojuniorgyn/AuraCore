/**
 * 💰 CREATE BANK ACCOUNT - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 * REPO-005: branchId obrigatório
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { bankAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  ICreateBankAccount,
  CreateBankAccountInput,
  BankAccountOutput,
  ExecutionContext,
} from '../../domain/ports/input/IBankAccountUseCases';

@injectable()
export class CreateBankAccountUseCase implements ICreateBankAccount {
  async execute(
    input: CreateBankAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<BankAccountOutput, string>> {
    const name = input.name.trim();
    if (!name) return Result.fail('Nome é obrigatório');

    const balance = input.initialBalance?.toString() || '0.00';

    await db.insert(bankAccounts).values({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      name,
      bankCode: input.bankCode || null,
      bankName: input.bankName || null,
      agency: input.agency || null,
      accountNumber: input.accountNumber || null,
      accountType: input.accountType || 'CHECKING',
      initialBalance: balance,
      currentBalance: balance,
      status: 'ACTIVE',
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      version: 1,
    });

    // Buscar criado
    const rows = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.organizationId, ctx.organizationId),
          eq(bankAccounts.name, name),
          isNull(bankAccounts.deletedAt)
        )
      )
      .orderBy(bankAccounts.id);

    const created = rows[rows.length - 1];
    if (!created) return Result.fail('Erro ao recuperar conta bancária criada');

    return Result.ok({
      id: created.id,
      organizationId: created.organizationId,
      branchId: created.branchId ?? 0,
      name: created.name,
      bankCode: created.bankCode ?? null,
      bankName: created.bankName ?? null,
      agency: created.agency ?? null,
      accountNumber: created.accountNumber ?? null,
      accountType: created.accountType ?? 'CHECKING',
      initialBalance: created.initialBalance ?? '0.00',
      currentBalance: created.currentBalance ?? '0.00',
      status: created.status ?? 'ACTIVE',
    });
  }
}
