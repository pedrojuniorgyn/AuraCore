/**
 * 📊 LIST CHART OF ACCOUNTS - QUERY (ARCH-013)
 * 
 * Lista plano de contas (flat + tree) com filtros opcionais.
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { chartOfAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IListChartOfAccounts,
  ListChartAccountsInput,
  ListChartAccountsOutput,
  ChartAccountOutput,
  ChartAccountTreeNode,
} from '../../domain/ports/input/IChartOfAccountsUseCases';
import type { ExecutionContext } from '../../domain/types/journal-entry.types';

@injectable()
export class ListChartOfAccountsUseCase implements IListChartOfAccounts {
  async execute(
    input: ListChartAccountsInput,
    ctx: ExecutionContext
  ): Promise<Result<ListChartAccountsOutput, string>> {
    const conditions = [
      eq(chartOfAccounts.organizationId, ctx.organizationId),
      isNull(chartOfAccounts.deletedAt),
    ];

    if (input.type) {
      conditions.push(eq(chartOfAccounts.type, input.type));
    }

    const allAccounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(...conditions))
      .orderBy(chartOfAccounts.code);

    const flat: ChartAccountOutput[] = allAccounts
      .filter((acc) => {
        if (input.analytical !== undefined) {
          return acc.isAnalytical === (input.analytical ? 'true' : 'false');
        }
        return true;
      })
      .map(mapToOutput);

    // Build tree from all accounts (unfiltered for hierarchy)
    const allMapped = allAccounts.map(mapToOutput);
    const buildTree = (parentId: number | null = null): ChartAccountTreeNode[] => {
      return allMapped
        .filter((acc) => acc.parentId === parentId)
        .map((acc) => ({
          ...acc,
          children: buildTree(acc.id),
        }));
    };

    return Result.ok({ flat, tree: buildTree(null) });
  }
}

function mapToOutput(row: typeof chartOfAccounts.$inferSelect): ChartAccountOutput {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    name: row.name,
    type: row.type ?? '',
    category: row.category ?? null,
    parentId: row.parentId ?? null,
    level: row.level ?? 0,
    isAnalytical: row.isAnalytical ?? 'false',
    acceptsCostCenter: row.acceptsCostCenter ?? 'false',
    requiresCostCenter: row.requiresCostCenter ?? 'false',
    status: row.status ?? 'ACTIVE',
  };
}
