/**
 * 📊 DELETE CHART ACCOUNT - COMMAND (ARCH-012)
 * F2.4: Migração para DDD
 * 
 * Usa AccountIntegrityService (F1.8) para validar exclusão.
 * Soft delete: seta deletedAt.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { chartOfAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { ACCOUNTING_TOKENS } from '../../infrastructure/di/tokens';
import { AccountIntegrityService } from '../../domain/services/AccountIntegrityService';
import type { IChartOfAccountsRepository } from '../../domain/ports/output/IChartOfAccountsRepository';
import type {
  IDeleteChartAccount,
  DeleteChartAccountInput,
} from '../../domain/ports/input/IChartOfAccountsUseCases';
import type { ExecutionContext } from '../../domain/types/journal-entry.types';

@injectable()
export class DeleteChartAccountUseCase implements IDeleteChartAccount {
  constructor(
    @inject(ACCOUNTING_TOKENS.ChartOfAccountsRepository)
    private readonly chartRepo: IChartOfAccountsRepository
  ) {}

  async execute(
    input: DeleteChartAccountInput,
    ctx: ExecutionContext
  ): Promise<Result<void, string>> {
    // Buscar conta
    const account = await this.chartRepo.findById(input.id, ctx.organizationId);
    if (!account) {
      return Result.fail(`Conta contábil #${input.id} não encontrada`);
    }

    // Verificar integridade (F1.8): bloquear se tem lançamentos
    const linkedCount = await this.chartRepo.countLinkedEntries(input.id, ctx.organizationId);
    const validationResult = AccountIntegrityService.validateDeletion({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        isAnalytical: account.isAnalytical,
        status: account.status,
      },
      linkedEntriesCount: linkedCount,
    });

    if (Result.isFail(validationResult)) {
      return Result.fail(validationResult.error);
    }

    // Verificar se tem filhos
    const children = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.parentId, input.id),
          eq(chartOfAccounts.organizationId, ctx.organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (children.length > 0) {
      return Result.fail(
        `Não é possível excluir conta "${account.code} - ${account.name}". ` +
        `Existem ${children.length} conta(s) filha(s).`
      );
    }

    // Soft delete
    await db
      .update(chartOfAccounts)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(
        and(
          eq(chartOfAccounts.id, input.id),
          eq(chartOfAccounts.organizationId, ctx.organizationId)
        )
      );

    return Result.ok(undefined);
  }
}
