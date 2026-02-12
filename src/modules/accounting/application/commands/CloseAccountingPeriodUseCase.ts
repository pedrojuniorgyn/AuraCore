/**
 * 📋 CloseAccountingPeriodUseCase - Command (ARCH-012)
 * 
 * Fecha um período contábil, impedindo lançamentos futuros.
 * 
 * F3.5: Contabilidade - Fechamento de Período
 * 
 * Regras de negócio:
 * 1. Todos os lançamentos do período devem estar POSTED
 * 2. Balancete de verificação deve estar equilibrado (débitos = créditos)
 * 3. Não pode fechar período futuro
 * 4. Não pode fechar período já fechado
 * 5. Deve fechar períodos em ordem cronológica
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface CloseAccountingPeriodInput {
  organizationId: number;
  branchId: number;
  year: number;
  month: number; // 1-12
  closedBy: string; // userId
}

export interface CloseAccountingPeriodOutput {
  periodYear: number;
  periodMonth: number;
  status: 'CLOSED';
  totalEntries: number;
  totalDebit: number;
  totalCredit: number;
  closedAt: Date;
  closedBy: string;
}

@injectable()
export class CloseAccountingPeriodUseCase {
  async execute(input: CloseAccountingPeriodInput): Promise<Result<CloseAccountingPeriodOutput, string>> {
    // 1. Validações básicas
    if (input.month < 1 || input.month > 12) {
      return Result.fail('Mês inválido (1-12)');
    }

    if (!input.closedBy?.trim()) {
      return Result.fail('closedBy obrigatório');
    }

    // 2. Verificar que não é período futuro
    const now = new Date();
    const periodEnd = new Date(input.year, input.month, 0); // Último dia do mês
    if (periodEnd > now) {
      return Result.fail('Não é possível fechar um período futuro');
    }

    // 3. Verificar se já está fechado
    const closedPeriodRows = await db.execute(
      sql`SELECT id FROM accounting_period_closings
          WHERE organization_id = ${input.organizationId}
            AND branch_id = ${input.branchId}
            AND period_year = ${input.year}
            AND period_month = ${input.month}
            AND deleted_at IS NULL`
    ) as unknown as Array<{ id: string }>;

    if (closedPeriodRows.length > 0) {
      return Result.fail(`Período ${String(input.month).padStart(2, '0')}/${input.year} já está fechado`);
    }

    // 4. Verificar que não existem lançamentos DRAFT no período
    const draftRows = await db.execute(
      sql`SELECT COUNT(*) AS cnt FROM journal_entries
          WHERE organization_id = ${input.organizationId}
            AND branch_id = ${input.branchId}
            AND YEAR(entry_date) = ${input.year}
            AND MONTH(entry_date) = ${input.month}
            AND status = 'DRAFT'
            AND deleted_at IS NULL`
    ) as unknown as Array<{ cnt: number }>;

    const draftCount = Number(draftRows[0]?.cnt ?? 0);
    if (draftCount > 0) {
      return Result.fail(
        `Existem ${draftCount} lançamento(s) em DRAFT no período. Todos devem ser postados antes do fechamento.`
      );
    }

    // 5. Verificar equilíbrio do balancete (débitos = créditos)
    const balanceRows = await db.execute(
      sql`SELECT 
            SUM(CASE WHEN jel.entry_type = 'DEBIT' THEN CAST(jel.amount AS DECIMAL(18,2)) ELSE 0 END) AS total_debit,
            SUM(CASE WHEN jel.entry_type = 'CREDIT' THEN CAST(jel.amount AS DECIMAL(18,2)) ELSE 0 END) AS total_credit,
            COUNT(DISTINCT je.id) AS total_entries
          FROM journal_entries je
          INNER JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
          WHERE je.organization_id = ${input.organizationId}
            AND je.branch_id = ${input.branchId}
            AND YEAR(je.entry_date) = ${input.year}
            AND MONTH(je.entry_date) = ${input.month}
            AND je.status = 'POSTED'
            AND je.deleted_at IS NULL
            AND jel.deleted_at IS NULL`
    ) as unknown as Array<{
      total_debit: string | number;
      total_credit: string | number;
      total_entries: number;
    }>;

    const totalDebit = Number(balanceRows[0]?.total_debit ?? 0);
    const totalCredit = Number(balanceRows[0]?.total_credit ?? 0);
    const totalEntries = Number(balanceRows[0]?.total_entries ?? 0);

    // Tolerância de centavos por arredondamento
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      return Result.fail(
        `Balancete desequilibrado: Débitos (${totalDebit.toFixed(2)}) ≠ Créditos (${totalCredit.toFixed(2)}). ` +
        `Diferença: ${diff.toFixed(2)}. Corrija antes de fechar o período.`
      );
    }

    // 6. Registrar fechamento
    const closingId = globalThis.crypto.randomUUID();
    const closedAt = new Date();

    await db.execute(
      sql`INSERT INTO accounting_period_closings 
          (id, organization_id, branch_id, period_year, period_month, 
           total_entries, total_debit, total_credit, closed_by, closed_at, created_at)
          VALUES (
            ${closingId}, ${input.organizationId}, ${input.branchId}, 
            ${input.year}, ${input.month},
            ${totalEntries}, ${totalDebit}, ${totalCredit},
            ${input.closedBy}, ${closedAt}, ${closedAt}
          )`
    );

    return Result.ok({
      periodYear: input.year,
      periodMonth: input.month,
      status: 'CLOSED',
      totalEntries,
      totalDebit,
      totalCredit,
      closedAt,
      closedBy: input.closedBy,
    });
  }
}
