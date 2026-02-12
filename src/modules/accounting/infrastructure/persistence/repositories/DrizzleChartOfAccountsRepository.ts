/**
 * DrizzleChartOfAccountsRepository - Infrastructure (F1.8)
 * 
 * Implementação do IChartOfAccountsRepository usando Drizzle ORM.
 * Acessa tabela chart_of_accounts (legacy INT) para validações de integridade.
 */
import { injectable } from 'tsyringe';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chartOfAccounts } from '@/lib/db/schema';
import type { IChartOfAccountsRepository, ChartAccountInfo } from '../../../domain/ports/output/IChartOfAccountsRepository';

@injectable()
export class DrizzleChartOfAccountsRepository implements IChartOfAccountsRepository {

  private mapToChartAccountInfo(row: typeof chartOfAccounts.$inferSelect): ChartAccountInfo {
    return {
      id: row.id,
      organizationId: row.organizationId,
      code: row.code,
      name: row.name,
      type: row.type,
      category: row.category,
      parentId: row.parentId,
      level: row.level ?? 0,
      isAnalytical: row.isAnalytical === 'true',
      status: row.status ?? 'ACTIVE',
    };
  }

  async findById(id: number, organizationId: number): Promise<ChartAccountInfo | null> {
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId)
        )
      );

    const row = rows[0];
    return row ? this.mapToChartAccountInfo(row) : null;
  }

  async findByCode(code: string, organizationId: number): Promise<ChartAccountInfo | null> {
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.code, code),
          eq(chartOfAccounts.organizationId, organizationId)
        )
      );

    const row = rows[0];
    return row ? this.mapToChartAccountInfo(row) : null;
  }

  async countLinkedEntries(accountId: number, organizationId: number): Promise<number> {
    // Query journal_entry_lines que referenciam esta conta
    // accountId em journal_entry_lines é char(36), mas chart_of_accounts.id é int
    // Usamos accountCode para correlação ou conversão de ID
    const result = await db.execute(
      sql`SELECT COUNT(*) as cnt 
          FROM journal_entry_lines jel
          INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
          WHERE (jel.account_id = CAST(${accountId} AS NVARCHAR(36)) 
                 OR jel.account_code IN (
                   SELECT code FROM chart_of_accounts WHERE id = ${accountId} AND organization_id = ${organizationId}
                 ))
          AND je.organization_id = ${organizationId}`
    );

    const rows = (result as unknown as Array<{ cnt: number }>);
    return rows[0]?.cnt ?? 0;
  }

  async hasPostedEntries(accountId: number, organizationId: number): Promise<boolean> {
    const result = await db.execute(
      sql`SELECT TOP 1 1 as found
          FROM journal_entry_lines jel
          INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
          WHERE (jel.account_id = CAST(${accountId} AS NVARCHAR(36)) 
                 OR jel.account_code IN (
                   SELECT code FROM chart_of_accounts WHERE id = ${accountId} AND organization_id = ${organizationId}
                 ))
          AND je.organization_id = ${organizationId}
          AND je.status = 'POSTED'`
    );

    const rows = (result as unknown as Array<{ found: number }>);
    return (rows[0]?.found ?? 0) === 1;
  }

  async findByIds(ids: number[], organizationId: number): Promise<ChartAccountInfo[]> {
    if (ids.length === 0) return [];

    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          inArray(chartOfAccounts.id, ids),
          eq(chartOfAccounts.organizationId, organizationId)
        )
      );

    return rows.map(r => this.mapToChartAccountInfo(r));
  }

  async findByCodes(codes: string[], organizationId: number): Promise<ChartAccountInfo[]> {
    if (codes.length === 0) return [];

    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          inArray(chartOfAccounts.code, codes),
          eq(chartOfAccounts.organizationId, organizationId)
        )
      );

    return rows.map(r => this.mapToChartAccountInfo(r));
  }

  async deactivate(id: number, organizationId: number): Promise<void> {
    await db
      .update(chartOfAccounts)
      .set({
        status: 'INACTIVE',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId)
        )
      );
  }
}
