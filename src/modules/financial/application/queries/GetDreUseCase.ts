/**
 * 💰 GET DRE - QUERY (ARCH-013)
 * F2.4: Usa vw_dre_report SQL View
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type {
  IGetDre,
  GetDreInput,
  GetDreOutput,
  DrePeriod,
} from '../../domain/ports/input/IDreUseCases';

type ExecutionContext = {
  organizationId: number;
  branchId: number;
  userId: string;
};

@injectable()
export class GetDreUseCase implements IGetDre {
  async execute(
    input: GetDreInput,
    ctx: ExecutionContext
  ): Promise<Result<GetDreOutput, string>> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return Result.fail('Datas inválidas. Use formato YYYY-MM-DD');
    }

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;

    const rows = await db.execute(
      sql`SELECT
            period_year, period_month,
            total_revenue, total_expense,
            net_profit, profit_margin_pct
          FROM vw_dre_report
          WHERE organization_id = ${ctx.organizationId}
            AND branch_id = ${ctx.branchId}
            AND (period_year * 100 + period_month) >= ${startYear * 100 + startMonth}
            AND (period_year * 100 + period_month) <= ${endYear * 100 + endMonth}
          ORDER BY period_year, period_month`
    ) as unknown as Array<{
      period_year: number;
      period_month: number;
      total_revenue: string;
      total_expense: string;
      net_profit: string;
      profit_margin_pct: string;
    }>;

    const periods: DrePeriod[] = rows.map((r) => ({
      periodYear: r.period_year,
      periodMonth: r.period_month,
      totalRevenue: Number(r.total_revenue),
      totalExpense: Number(r.total_expense),
      netProfit: Number(r.net_profit),
      profitMarginPct: Number(r.profit_margin_pct),
    }));

    const totalRevenue = periods.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalExpense = periods.reduce((sum, p) => sum + p.totalExpense, 0);
    const netProfit = totalRevenue - totalExpense;
    const profitMarginPct = totalRevenue > 0
      ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    return Result.ok({
      periods,
      consolidated: { totalRevenue, totalExpense, netProfit, profitMarginPct },
    });
  }
}
