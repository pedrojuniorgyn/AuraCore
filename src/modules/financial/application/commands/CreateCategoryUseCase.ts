/**
 * 💰 CREATE CATEGORY - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { financialCategories } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  ICreateCategory,
  CreateCategoryInput,
  CategoryOutput,
  ExecutionContext,
} from '../../domain/ports/input/ICategoryUseCases';

@injectable()
export class CreateCategoryUseCase implements ICreateCategory {
  async execute(
    input: CreateCategoryInput,
    ctx: ExecutionContext
  ): Promise<Result<CategoryOutput, string>> {
    const name = input.name.trim();
    if (!name) return Result.fail('Nome é obrigatório');
    if (!input.type) return Result.fail('Tipo é obrigatório');

    await db.insert(financialCategories).values({
      organizationId: ctx.organizationId,
      name,
      code: input.code || null,
      type: input.type,
      description: input.description || null,
      status: 'ACTIVE',
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      version: 1,
    });

    // Buscar criado (by name + org)
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
          eq(financialCategories.organizationId, ctx.organizationId),
          eq(financialCategories.name, name),
          isNull(financialCategories.deletedAt)
        )
      );

    const created = rows[rows.length - 1]; // último inserido
    if (!created) return Result.fail('Erro ao recuperar categoria criada');

    return Result.ok({
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      code: created.code,
      type: created.type,
      description: created.description,
      status: created.status ?? 'ACTIVE',
    });
  }
}
