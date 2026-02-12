/**
 * 💰 CASH FLOW - INPUT PORTS (ARCH-010)
 * F2.4: DDD Query para Fluxo de Caixa (usa vw_cash_flow)
 */
import type { Result } from '@/shared/domain';

export interface CashFlowPeriod {
  periodYear: number;
  periodMonth: number;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
}

export interface GetCashFlowInput {
  monthsAhead?: number; // default 3
}

export interface GetCashFlowOutput {
  periods: CashFlowPeriod[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
  };
}

export type ExecutionContext = {
  organizationId: number;
  branchId: number;
  userId: string;
};

export interface IGetCashFlow {
  execute(input: GetCashFlowInput, ctx: ExecutionContext): Promise<Result<GetCashFlowOutput, string>>;
}
