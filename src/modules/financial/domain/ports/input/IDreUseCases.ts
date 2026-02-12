/**
 * 💰 DRE - INPUT PORTS (ARCH-010)
 * F2.4: DDD Query para DRE (usa vw_dre_report)
 */
import type { Result } from '@/shared/domain';

export interface DrePeriod {
  periodYear: number;
  periodMonth: number;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMarginPct: number;
}

export interface GetDreInput {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface GetDreOutput {
  periods: DrePeriod[];
  consolidated: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    profitMarginPct: number;
  };
}

export type ExecutionContext = {
  organizationId: number;
  branchId: number;
  userId: string;
};

export interface IGetDre {
  execute(input: GetDreInput, ctx: ExecutionContext): Promise<Result<GetDreOutput, string>>;
}
