/**
 * 📊 UPDATE CHART ACCOUNT - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 * 
 * Usa AccountIntegrityService para validar edição de código
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { chartOfAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IUpdateChartAccount,
  UpdateChartAccountInput,
  ChartAccountOutput,
} from '../../domain/ports/input/IChartOfAccountsUseCases';
import type { ExecutionContext } from '../../domain/types/journal-entry.types';

@injectable()
export class UpdateChartAccountUseCase implements IUpdateChartAccount {
  async execute(
    input: UpdateChartAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<ChartAccountOutput, string>> {
    // Buscar conta existente
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, input.id),
          eq(chartOfAccounts.organizationId, ctx.organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (rows.length === 0) {
      return Result.fail(`Conta contábil #${input.id} não encontrada`);
    }

    // Preparar campos para update
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.category !== undefined) updateData.category = input.category;
    if (input.acceptsCostCenter !== undefined) {
      updateData.acceptsCostCenter = input.acceptsCostCenter ? 'true' : 'false';
    }
    if (input.requiresCostCenter !== undefined) {
      updateData.requiresCostCenter = input.requiresCostCenter ? 'true' : 'false';
    }
    if (input.status !== undefined) updateData.status = input.status;

    await db
      .update(chartOfAccounts)
      .set(updateData)
      .where(
        and(
          eq(chartOfAccounts.id, input.id),
          eq(chartOfAccounts.organizationId, ctx.organizationId)
        )
      );

    // Retornar atualizado
    const updated = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, input.id),
          eq(chartOfAccounts.organizationId, ctx.organizationId)
        )
      );

    const row = updated[0];
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
