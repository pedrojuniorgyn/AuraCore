/**
 * 💰 GET COST CENTER BY ID - QUERY (ARCH-013)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { costCenters } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IGetCostCenterById,
  CostCenterOutput,
  ExecutionContext,
} from '../../domain/ports/input/ICostCenterUseCases';

@injectable()
export class GetCostCenterByIdUseCase implements IGetCostCenterById {
  async execute(id: number, ctx: ExecutionContext): Promise<Result<CostCenterOutput, string>> {
    const rows = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId),
          isNull(costCenters.deletedAt)
        )
      );

    if (rows.length === 0) {
      return Result.fail(`Centro de custo #${id} não encontrado`);
    }

    const row = rows[0];
    return Result.ok({
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
    });
  }
}
