/**
 * 📊 GET CHART ACCOUNT BY ID - QUERY (ARCH-013)
 * F2.4: Migração para DDD
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { chartOfAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IGetChartAccountById,
  ChartAccountOutput,
} from '../../domain/ports/input/IChartOfAccountsUseCases';
import type { ExecutionContext } from '../../domain/types/journal-entry.types';

@injectable()
export class GetChartAccountByIdUseCase implements IGetChartAccountById {
  async execute(
    id: number,
    ctx: ExecutionContext
  ): Promise<Result<ChartAccountOutput, string>> {
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, ctx.organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (rows.length === 0) {
      return Result.fail(`Conta contábil #${id} não encontrada`);
    }

    const row = rows[0];
    return Result.ok({
      id: row.id,
      organizationId: row.organizationId,
      code: row.code,
      name: row.name,
      type: row.type ?? '',
      category: row.category ?? null,
      parentId: row.parentId ?? null,
      level: row.level ?? 0,
      isAnalytical: row.isAnalytical ?? 'false',
      acceptsCostCenter: row.acceptsCostCenter ?? 'false',
      requiresCostCenter: row.requiresCostCenter ?? 'false',
      status: row.status ?? 'ACTIVE',
    });
  }
}
