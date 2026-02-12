/**
 * 💰 BANK ACCOUNTS - INPUT PORTS (ARCH-010)
 * F2.4: Migração para DDD
 */
import type { Result } from '@/shared/domain';

export interface BankAccountOutput {
  id: number;
  organizationId: number;
  branchId: number;
  name: string;
  bankCode: string | null;
  bankName: string | null;
  agency: string | null;
  accountNumber: string | null;
  accountType: string;
  initialBalance: string;
  currentBalance: string;
  status: string;
}

export interface CreateBankAccountInput {
  name: string;
  bankCode?: string;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  accountType?: string;
  initialBalance?: number;
}

export interface UpdateBankAccountInput {
  id: number;
  name?: string;
  bankCode?: string;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  status?: string;
}

export type ExecutionContext = {
  organizationId: number;
  branchId: number;
  userId: string;
};

export interface IListBankAccounts {
  execute(ctx: ExecutionContext): Promise<Result<BankAccountOutput[], string>>;
}

export interface ICreateBankAccount {
  execute(input: CreateBankAccountInput, ctx: ExecutionContext): Promise<Result<BankAccountOutput, string>>;
}

export interface IUpdateBankAccount {
  execute(input: UpdateBankAccountInput, ctx: ExecutionContext): Promise<Result<BankAccountOutput, string>>;
}
