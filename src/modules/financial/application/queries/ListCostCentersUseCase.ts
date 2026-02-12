/**
 * 💰 LIST COST CENTERS - QUERY (ARCH-013)
 * F2.4: Migração para DDD
 * REPO-005: branchId obrigatório em toda query
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { costCenters } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IListCostCenters,
  ListCostCentersOutput,
  CostCenterOutput,
  CostCenterTreeNode,
  ExecutionContext,
} from '../../domain/ports/input/ICostCenterUseCases';

@injectable()
export class ListCostCentersUseCase implements IListCostCenters {
  async execute(ctx: ExecutionContext): Promise<Result<ListCostCentersOutput, string>> {
    const allRows = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId),
          isNull(costCenters.deletedAt)
        )
      )
      .orderBy(costCenters.code);

    const flat: CostCenterOutput[] = allRows.map(mapToOutput);

    const buildTree = (parentId: number | null = null): CostCenterTreeNode[] => {
      return flat
        .filter((cc) => cc.parentId === parentId)
        .map((cc) => ({
          ...cc,
          children: buildTree(cc.id),
        }));
    };

    return Result.ok({ flat, tree: buildTree(null) });
  }
}

function mapToOutput(row: typeof costCenters.$inferSelect): CostCenterOutput {
  return {
    id: row.id,
    organizationId: row.organizationId,
    branchId: row.branchId ?? 0,
    code: row.code,
    name: row.name,
    type: row.type ?? 'ANALYTIC',
    parentId: row.parentId ?? null,
    level: row.level ?? 0,
    isAnalytical: row.isAnalytical ?? 'true',
    linkedVehicleId: row.linkedVehicleId ?? null,
    class: row.class ?? 'BOTH',
    status: row.status ?? 'ACTIVE',
  };
}
