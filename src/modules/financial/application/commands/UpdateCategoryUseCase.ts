/**
 * 💰 UPDATE CATEGORY - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { financialCategories } from '@/modules/financial/infrastructure/persistence/schemas';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IUpdateCategory,
  UpdateCategoryInput,
  CategoryOutput,
  ExecutionContext,
} from '../../domain/ports/input/ICategoryUseCases';

@injectable()
export class UpdateCategoryUseCase implements IUpdateCategory {
  async execute(
    input: UpdateCategoryInput,
    ctx: ExecutionContext
  ): Promise<Result<CategoryOutput, string>> {
    // Verificar existência
    const existing = await db
      .select({ id: financialCategories.id })
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.id, input.id),
          eq(financialCategories.organizationId, ctx.organizationId),
          isNull(financialCategories.deletedAt)
        )
      );

    if (existing.length === 0) {
      return Result.fail(`Categoria #${input.id} não encontrada`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.code !== undefined) updateData.code = input.code;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;

    await db
      .update(financialCategories)
      .set(updateData)
      .where(
        and(
          eq(financialCategories.id, input.id),
          eq(financialCategories.organizationId, ctx.organizationId)
        )
      );

    const rows = await db
      .select({
        id: financialCategories.id,
        organizationId: financialCategories.organizationId,
        name: financialCategories.name,
        code: financialCategories.code,
        type: financialCategories.type,
        description: financialCategories.description,
        status: financialCategories.status,
      })
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.id, input.id),
          eq(financialCategories.organizationId, ctx.organizationId)
        )
      );

    const row = rows[0];
    return Result.ok({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      code: row.code,
      type: row.type,
      description: row.description,
      status: row.status ?? 'ACTIVE',
    });
  }
}
