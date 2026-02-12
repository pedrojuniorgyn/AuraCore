/**
 * 💰 DELETE CATEGORY - COMMAND (ARCH-012)
 * F2.4: Soft delete de categoria financeira
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { financialCategories } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IDeleteCategory,
  ExecutionContext,
} from '../../domain/ports/input/ICategoryUseCases';

@injectable()
export class DeleteCategoryUseCase implements IDeleteCategory {
  async execute(
    id: number,
    ctx: ExecutionContext
  ): Promise<Result<void, string>> {
    const existing = await db
      .select({ id: financialCategories.id })
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.id, id),
          eq(financialCategories.organizationId, ctx.organizationId),
          isNull(financialCategories.deletedAt)
        )
      );

    if (existing.length === 0) {
      return Result.fail(`Categoria #${id} não encontrada`);
    }

    await db
      .update(financialCategories)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(
        and(
          eq(financialCategories.id, id),
          eq(financialCategories.organizationId, ctx.organizationId)
        )
      );

    return Result.ok(undefined);
  }
}
