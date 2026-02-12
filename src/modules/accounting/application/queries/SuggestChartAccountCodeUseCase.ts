/**
 * 📊 SUGGEST CHART ACCOUNT CODE - QUERY (ARCH-013)
 * F2.4: Migração para DDD
 * 
 * Sugere o próximo código para uma conta contábil.
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { chartOfAccounts } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import type {
  ISuggestChartAccountCode,
  SuggestCodeInput,
  SuggestCodeOutput,
} from '../../domain/ports/input/IChartOfAccountsUseCases';
import type { ExecutionContext } from '../../domain/types/journal-entry.types';

@injectable()
export class SuggestChartAccountCodeUseCase implements ISuggestChartAccountCode {
  async execute(
    input: SuggestCodeInput,
    ctx: ExecutionContext
  ): Promise<Result<SuggestCodeOutput, string>> {
    let parentCode: string | null = null;

    if (input.parentId) {
      // Buscar pai para determinar prefixo
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
      parentCode = parent[0].code;
    }

    // Buscar filhos existentes para calcular próximo
    const conditions = [
      eq(chartOfAccounts.organizationId, ctx.organizationId),
      isNull(chartOfAccounts.deletedAt),
    ];

    if (input.parentId) {
      conditions.push(eq(chartOfAccounts.parentId, input.parentId));
    } else {
      // Contas raiz (level 0)
      conditions.push(eq(chartOfAccounts.level, 0));
    }

    const siblings = await db
      .select({ code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(...conditions))
      .orderBy(chartOfAccounts.code);

    let suggestedCode: string;

    if (parentCode) {
      // Sugerir próximo sub-código: parentCode.XX
      const childCodes = siblings
        .map((s) => s.code)
        .filter((c) => c.startsWith(parentCode + '.'));

      if (childCodes.length === 0) {
        suggestedCode = `${parentCode}.01`;
      } else {
        const lastCode = childCodes[childCodes.length - 1];
        const lastParts = lastCode.split('.');
        const lastNum = parseInt(lastParts[lastParts.length - 1], 10);
        const nextNum = (lastNum + 1).toString().padStart(2, '0');
        lastParts[lastParts.length - 1] = nextNum;
        suggestedCode = lastParts.join('.');
      }
    } else {
      // Contas raiz
      if (siblings.length === 0) {
        suggestedCode = '1';
      } else {
        const lastCode = siblings[siblings.length - 1].code;
        const firstPart = lastCode.split('.')[0];
        suggestedCode = String(parseInt(firstPart, 10) + 1);
      }
    }

    return Result.ok({ suggestedCode, parentCode });
  }
}
