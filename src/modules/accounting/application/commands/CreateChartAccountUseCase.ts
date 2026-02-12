/**
 * 📊 CREATE CHART ACCOUNT - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { chartOfAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  ICreateChartAccount,
  CreateChartAccountInput,
  ChartAccountOutput,
} from '../../domain/ports/input/IChartOfAccountsUseCases';
import type { ExecutionContext } from '../../domain/types/journal-entry.types';

@injectable()
export class CreateChartAccountUseCase implements ICreateChartAccount {
  async execute(
    input: CreateChartAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<ChartAccountOutput, string>> {
    const code = input.code.trim();
    const name = input.name.trim();

    // Validações
    if (!code) return Result.fail('Código é obrigatório');
    if (!name) return Result.fail('Nome é obrigatório');
    if (!input.type) return Result.fail('Tipo é obrigatório');

    const validTypes = ['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY'];
    if (!validTypes.includes(input.type)) {
      return Result.fail(`Tipo inválido. Use: ${validTypes.join(', ')}`);
    }

    const validCategories = [
      'OPERATIONAL_OWN_FLEET', 'OPERATIONAL_THIRD_PARTY',
      'ADMINISTRATIVE', 'FINANCIAL', 'TAX',
    ];
    if (input.category && !validCategories.includes(input.category)) {
      return Result.fail(`Categoria inválida. Use: ${validCategories.join(', ')}`);
    }

    // Verificar duplicação de código
    const existing = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.organizationId, ctx.organizationId),
          eq(chartOfAccounts.code, code),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (existing.length > 0) {
      return Result.fail('Código já existe');
    }

    // Calcular nível baseado no pai
    let level = 0;
    if (input.parentId) {
      const parent = await db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.id, input.parentId),
            eq(chartOfAccounts.organizationId, ctx.organizationId),
            isNull(chartOfAccounts.deletedAt)
          )
        );

      if (parent.length === 0) {
        return Result.fail('Conta pai não encontrada');
      }
      level = (parent[0].level || 0) + 1;
    }

    const isAnalytical = level > 0;

    // Criar
    const insertValues: typeof chartOfAccounts.$inferInsert = {
      organizationId: ctx.organizationId,
      code,
      name,
      type: input.type,
      category: input.category || '',
      parentId: input.parentId ?? undefined,
      level,
      isAnalytical: isAnalytical ? 'true' : 'false',
      acceptsCostCenter: input.acceptsCostCenter ? 'true' : 'false',
      requiresCostCenter: input.requiresCostCenter ? 'true' : 'false',
      status: 'ACTIVE',
      createdBy: ctx.userId,
    };

    await db.insert(chartOfAccounts).values(insertValues);

    // Buscar o registro criado (MSSQL SCOPE_IDENTITY via query by code)
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.organizationId, ctx.organizationId),
          eq(chartOfAccounts.code, code),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    const created = rows[0];
    if (!created) {
      return Result.fail('Erro ao recuperar conta criada');
    }

    return Result.ok({
      id: created.id,
      organizationId: created.organizationId,
      code: created.code,
      name: created.name,
      type: created.type ?? '',
      category: created.category ?? null,
      parentId: created.parentId ?? null,
      level: created.level ?? 0,
      isAnalytical: created.isAnalytical ?? 'false',
      acceptsCostCenter: created.acceptsCostCenter ?? 'false',
      requiresCostCenter: created.requiresCostCenter ?? 'false',
      status: created.status ?? 'ACTIVE',
    });
  }
}
