/**
 * 💰 CREATE COST CENTER - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 * REPO-005: branchId obrigatório
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { costCenters } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { insertReturning, queryFirst } from '@/lib/db/query-helpers';
import type {
  ICreateCostCenter,
  CreateCostCenterInput,
  CostCenterOutput,
  ExecutionContext,
} from '../../domain/ports/input/ICostCenterUseCases';

@injectable()
export class CreateCostCenterUseCase implements ICreateCostCenter {
  async execute(
    input: CreateCostCenterInput,
    ctx: ExecutionContext
  ): Promise<Result<CostCenterOutput, string>> {
    const code = input.code.trim();
    const name = input.name.trim();

    if (!code) return Result.fail('Código é obrigatório');
    if (!name) return Result.fail('Nome é obrigatório');

    // Verificar duplicação
    const existing = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId),
          eq(costCenters.code, code),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length > 0) {
      return Result.fail('Código já existe');
    }

    // Calcular nível
    let level = 0;
    if (input.parentId) {
      const parent = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.id, input.parentId),
            eq(costCenters.organizationId, ctx.organizationId),
            eq(costCenters.branchId, ctx.branchId),
            isNull(costCenters.deletedAt)
          )
        );

      if (parent.length === 0) {
        return Result.fail('Centro de custo pai não encontrado');
      }
      level = (parent[0].level || 0) + 1;
    }

    const costCenterData: typeof costCenters.$inferInsert = {
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      code,
      name,
      type: input.type,
      parentId: input.parentId || null,
      level,
      isAnalytical: input.type === 'ANALYTIC' ? 'true' : 'false',
      linkedVehicleId: input.linkedVehicleId || null,
      class: input.ccClass || 'BOTH',
      status: 'ACTIVE',
      createdBy: ctx.userId,
    };

    const insertQuery = db.insert(costCenters).values(costCenterData);
    const createdId = await insertReturning(insertQuery, { id: costCenters.id }) as Array<Record<string, unknown>>;
    const newId = createdId[0]?.id;

    if (!newId) {
      return Result.fail('Erro ao criar centro de custo');
    }

    const created = await queryFirst<typeof costCenters.$inferSelect>(
      db.select().from(costCenters).where(
        and(
          eq(costCenters.id, Number(newId)),
          eq(costCenters.organizationId, ctx.organizationId)
        )
      )
    );

    if (!created) {
      return Result.fail('Erro ao recuperar centro de custo criado');
    }

    return Result.ok({
      id: created.id,
      organizationId: created.organizationId,
      branchId: created.branchId ?? 0,
      code: created.code,
      name: created.name,
      type: created.type ?? 'ANALYTIC',
      parentId: created.parentId ?? null,
      level: created.level ?? 0,
      isAnalytical: created.isAnalytical ?? 'true',
      linkedVehicleId: created.linkedVehicleId ?? null,
      class: created.class ?? 'BOTH',
      status: created.status ?? 'ACTIVE',
    });
  }
}
