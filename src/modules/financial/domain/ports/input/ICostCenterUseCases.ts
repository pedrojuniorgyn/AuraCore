/**
 * 💰 COST CENTERS - INPUT PORTS (ARCH-010)
 * F2.4: Migração para DDD
 */
import type { Result } from '@/shared/domain';

export interface CostCenterOutput {
  id: number;
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  type: string;
  parentId: number | null;
  level: number;
  isAnalytical: string;
  linkedVehicleId: number | null;
  class: string;
  status: string;
}

export interface CostCenterTreeNode extends CostCenterOutput {
  children: CostCenterTreeNode[];
}

export interface ListCostCentersOutput {
  flat: CostCenterOutput[];
  tree: CostCenterTreeNode[];
}

export interface CreateCostCenterInput {
  code: string;
  name: string;
  type: 'ANALYTIC' | 'SYNTHETIC';
  parentId?: number | null;
  linkedVehicleId?: number | null;
  ccClass?: 'REVENUE' | 'EXPENSE' | 'BOTH';
}

export interface UpdateCostCenterInput {
  id: number;
  name?: string;
  type?: 'ANALYTIC' | 'SYNTHETIC';
  linkedVehicleId?: number | null;
  ccClass?: 'REVENUE' | 'EXPENSE' | 'BOTH';
  status?: string;
}

export type ExecutionContext = {
  organizationId: number;
  branchId: number;
  userId: string;
};

export interface IListCostCenters {
  execute(ctx: ExecutionContext): Promise<Result<ListCostCentersOutput, string>>;
}

export interface IGetCostCenterById {
  execute(id: number, ctx: ExecutionContext): Promise<Result<CostCenterOutput, string>>;
}

export interface ICreateCostCenter {
  execute(input: CreateCostCenterInput, ctx: ExecutionContext): Promise<Result<CostCenterOutput, string>>;
}

export interface IUpdateCostCenter {
  execute(input: UpdateCostCenterInput, ctx: ExecutionContext): Promise<Result<CostCenterOutput, string>>;
}

export interface IDeleteCostCenter {
  execute(id: number, ctx: ExecutionContext): Promise<Result<void, string>>;
}
