/**
 * 💰 UPDATE COST CENTER - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { costCenters } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IUpdateCostCenter,
  UpdateCostCenterInput,
  CostCenterOutput,
  ExecutionContext,
} from '../../domain/ports/input/ICostCenterUseCases';

@injectable()
export class UpdateCostCenterUseCase implements IUpdateCostCenter {
  async execute(
    input: UpdateCostCenterInput,
    ctx: ExecutionContext
  ): Promise<Result<CostCenterOutput, string>> {
    const existing = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, input.id),
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length === 0) {
      return Result.fail(`Centro de custo #${input.id} não encontrado`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.type !== undefined) {
      updateData.type = input.type;
      updateData.isAnalytical = input.type === 'ANALYTIC' ? 'true' : 'false';
    }
    if (input.linkedVehicleId !== undefined) updateData.linkedVehicleId = input.linkedVehicleId;
    if (input.ccClass !== undefined) updateData.class = input.ccClass;
    if (input.status !== undefined) updateData.status = input.status;

    await db
      .update(costCenters)
      .set(updateData)
      .where(
        and(
          eq(costCenters.id, input.id),
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId)
        )
      );

    const rows = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, input.id),
          eq(costCenters.organizationId, ctx.organizationId)
        )
      );

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
