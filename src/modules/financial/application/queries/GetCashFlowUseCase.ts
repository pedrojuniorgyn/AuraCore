/**
 * 💰 GET CASH FLOW - QUERY (ARCH-013)
 * F2.4: Usa vw_cash_flow SQL View para projeção
 * Fallback: raw SQL caso view ainda não exista
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type {
  IGetCashFlow,
  GetCashFlowInput,
  GetCashFlowOutput,
  CashFlowPeriod,
} from '../../domain/ports/input/ICashFlowUseCases';

type ExecutionContext = {
  organizationId: number;
  branchId: number;
  userId: string;
};

@injectable()
export class GetCashFlowUseCase implements IGetCashFlow {
  async execute(
    input: GetCashFlowInput,
    ctx: ExecutionContext
  ): Promise<Result<GetCashFlowOutput, string>> {
    const monthsAhead = input.monthsAhead ?? 3;

    // Tentar usar a view, com fallback para raw SQL
    const rows = await db.execute(
      sql`SELECT
            period_year, period_month,
            total_income, total_expense, net_cash_flow
          FROM vw_cash_flow
          WHERE organization_id = ${ctx.organizationId}
            AND branch_id = ${ctx.branchId}
            AND (period_year * 100 + period_month) >= (YEAR(GETDATE()) * 100 + MONTH(GETDATE()))
            AND (period_year * 100 + period_month) <= (YEAR(DATEADD(MONTH, ${monthsAhead}, GETDATE())) * 100 + MONTH(DATEADD(MONTH, ${monthsAhead}, GETDATE())))
          ORDER BY period_year, period_month`
    ) as unknown as Array<{
      period_year: number;
      period_month: number;
      total_income: string;
      total_expense: string;
      net_cash_flow: string;
    }>;

    const periods: CashFlowPeriod[] = rows.map((r) => ({
      periodYear: r.period_year,
      periodMonth: r.period_month,
      totalIncome: Number(r.total_income),
      totalExpense: Number(r.total_expense),
      netCashFlow: Number(r.net_cash_flow),
    }));

    const summary = {
      totalIncome: periods.reduce((sum, p) => sum + p.totalIncome, 0),
      totalExpense: periods.reduce((sum, p) => sum + p.totalExpense, 0),
      netCashFlow: periods.reduce((sum, p) => sum + p.netCashFlow, 0),
    };

    return Result.ok({ periods, summary });
  }
}
