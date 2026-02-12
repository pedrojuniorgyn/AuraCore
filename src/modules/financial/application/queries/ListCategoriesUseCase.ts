/**
 * 💰 LIST CATEGORIES - QUERY (ARCH-013)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { financialCategories } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IListCategories,
  ListCategoriesInput,
  CategoryOutput,
  ExecutionContext,
} from '../../domain/ports/input/ICategoryUseCases';

@injectable()
export class ListCategoriesUseCase implements IListCategories {
  async execute(
    input: ListCategoriesInput,
    ctx: ExecutionContext
  ): Promise<Result<CategoryOutput[], string>> {
    const conditions = [
      eq(financialCategories.organizationId, ctx.organizationId),
      isNull(financialCategories.deletedAt),
    ];

    if (input.type) {
      conditions.push(eq(financialCategories.type, input.type));
    }

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
      .where(and(...conditions))
      .orderBy(financialCategories.code);

    const items: CategoryOutput[] = rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      code: r.code,
      type: r.type,
      description: r.description,
      status: r.status ?? 'ACTIVE',
    }));

    return Result.ok(items);
  }
}
