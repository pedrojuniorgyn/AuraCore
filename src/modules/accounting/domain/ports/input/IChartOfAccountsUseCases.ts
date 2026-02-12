/**
 * 📊 CHART OF ACCOUNTS - INPUT PORTS (ARCH-010)
 * 
 * Interfaces para Use Cases do Plano de Contas.
 * F2.4: Migração para DDD
 */
import type { Result } from '@/shared/domain';

// ============================================================
// DTOs
// ============================================================

export interface ChartAccountOutput {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  type: string;
  category: string | null;
  parentId: number | null;
  level: number;
  isAnalytical: string;
  acceptsCostCenter: string;
  requiresCostCenter: string;
  status: string;
}

export interface ChartAccountTreeNode extends ChartAccountOutput {
  children: ChartAccountTreeNode[];
}

export interface ListChartAccountsInput {
  type?: string;
  analytical?: boolean;
}

export interface ListChartAccountsOutput {
  flat: ChartAccountOutput[];
  tree: ChartAccountTreeNode[];
}

export interface CreateChartAccountInput {
  code: string;
  name: string;
  type: string;
  category?: string | null;
  parentId?: number | null;
  acceptsCostCenter?: boolean;
  requiresCostCenter?: boolean;
}

export interface UpdateChartAccountInput {
  id: number;
  name?: string;
  category?: string | null;
  acceptsCostCenter?: boolean;
  requiresCostCenter?: boolean;
  status?: string;
}

export interface DeleteChartAccountInput {
  id: number;
}

export interface SuggestCodeInput {
  parentId?: number | null;
}

export interface SuggestCodeOutput {
  suggestedCode: string;
  parentCode: string | null;
}

// ============================================================
// INTERFACES (INPUT PORTS)
// ============================================================

import type { ExecutionContext } from '../../types/journal-entry.types';

export interface IListChartOfAccounts {
  execute(
    input: ListChartAccountsInput,
    ctx: ExecutionContext
  ): Promise<Result<ListChartAccountsOutput, string>>;
}

export interface IGetChartAccountById {
  execute(
    id: number,
    ctx: ExecutionContext
  ): Promise<Result<ChartAccountOutput, string>>;
}

export interface ICreateChartAccount {
  execute(
    input: CreateChartAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<ChartAccountOutput, string>>;
}

export interface IUpdateChartAccount {
  execute(
    input: UpdateChartAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<ChartAccountOutput, string>>;
}

export interface IDeleteChartAccount {
  execute(
    input: DeleteChartAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<void, string>>;
}

export interface ISuggestChartAccountCode {
  execute(
    input: SuggestCodeInput,
    ctx: ExecutionContext
  ): Promise<Result<SuggestCodeOutput, string>>;
}
