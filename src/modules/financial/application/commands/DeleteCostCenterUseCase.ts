/**
 * 💰 DELETE COST CENTER - COMMAND (ARCH-012)
 * F2.4: Soft delete de centro de custo
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { costCenters } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IDeleteCostCenter,
  ExecutionContext,
} from '../../domain/ports/input/ICostCenterUseCases';

@injectable()
export class DeleteCostCenterUseCase implements IDeleteCostCenter {
  async execute(id: number, ctx: ExecutionContext): Promise<Result<void, string>> {
    const existing = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length === 0) {
      return Result.fail(`Centro de custo #${id} não encontrado`);
    }

    // Verificar filhos
    const children = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(
        and(
          eq(costCenters.parentId, id),
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId),
          isNull(costCenters.deletedAt)
        )
      );

    if (children.length > 0) {
      return Result.fail(
        `Não é possível excluir. Existem ${children.length} centro(s) de custo filho(s).`
      );
    }

    await db
      .update(costCenters)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId)
        )
      );

    return Result.ok(undefined);
  }
}
