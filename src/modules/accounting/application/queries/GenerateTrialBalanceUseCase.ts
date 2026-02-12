/**
 * 📋 GenerateTrialBalanceUseCase - Query (ARCH-013)
 * 
 * Gera balancete de verificação para um período.
 * Usa a view SQL vw_trial_balance para performance.
 * 
 * F3.5: Contabilidade - Balancete de Verificação
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface GenerateTrialBalanceInput {
  organizationId: number;
  branchId: number;
  year: number;
  month: number; // 1-12
}

export interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface TrialBalanceOutput {
  period: { year: number; month: number };
  accounts: TrialBalanceAccount[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
  generatedAt: Date;
}

@injectable()
export class GenerateTrialBalanceUseCase {
  async execute(input: GenerateTrialBalanceInput): Promise<Result<TrialBalanceOutput, string>> {
    if (input.month < 1 || input.month > 12) {
      return Result.fail('Mês inválido (1-12)');
    }

    if (input.year < 2000 || input.year > 2100) {
      return Result.fail('Ano inválido');
    }

    const rows = await db.execute(
      sql`SELECT account_code, account_name, account_type,
                 total_debit, total_credit, balance
          FROM vw_trial_balance
          WHERE organization_id = ${input.organizationId}
            AND branch_id = ${input.branchId}
            AND period_year = ${input.year}
            AND period_month = ${input.month}
          ORDER BY account_code`
    ) as unknown as Array<{
      account_code: string;
      account_name: string;
      account_type: string;
      total_debit: string | number;
      total_credit: string | number;
      balance: string | number;
    }>;

    const accounts: TrialBalanceAccount[] = rows.map(r => ({
      accountCode: r.account_code,
      accountName: r.account_name ?? '',
      accountType: r.account_type ?? '',
      totalDebit: Number(r.total_debit) || 0,
      totalCredit: Number(r.total_credit) || 0,
      balance: Number(r.balance) || 0,
    }));

    const totals = accounts.reduce(
      (acc, a) => ({
        totalDebit: acc.totalDebit + a.totalDebit,
        totalCredit: acc.totalCredit + a.totalCredit,
        balance: acc.balance + a.balance,
      }),
      { totalDebit: 0, totalCredit: 0, balance: 0 }
    );

    return Result.ok({
      period: { year: input.year, month: input.month },
      accounts,
      totals,
      generatedAt: new Date(),
    });
  }
}
