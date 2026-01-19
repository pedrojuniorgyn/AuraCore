/**
 * Integração: FinancialKPIDataSource
 * Fonte de dados de KPIs do módulo Financial
 * 
 * Queries disponíveis:
 * - revenue.monthly: Receita do mês corrente
 * - ebitda.monthly: EBITDA do mês corrente
 * - margin.gross: Margem bruta percentual
 * - cash.balance: Saldo em caixa
 * - receivables.overdue: Total de recebíveis em atraso
 * 
 * @module strategic/infrastructure/integrations
 */
import { injectable } from 'tsyringe';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { IKPIDataSource, KPIDataPoint } from './IKPIDataSource';

@injectable()
export class FinancialKPIDataSource implements IKPIDataSource {
  readonly moduleName = 'financial';

  private readonly queries: Record<string, string> = {
    'revenue.monthly': `
      SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL(18,2))), 0) as value
      FROM financial_titles
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND type = 'RECEIVABLE'
        AND status = 'PAID'
        AND MONTH(payment_date) = MONTH(GETDATE())
        AND YEAR(payment_date) = YEAR(GETDATE())
        AND deleted_at IS NULL
    `,
    'ebitda.monthly': `
      SELECT 
        COALESCE(
          (SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL(18,2))), 0) FROM financial_titles 
           WHERE organization_id = @orgId AND branch_id = @branchId
             AND type = 'RECEIVABLE' AND status = 'PAID' 
             AND MONTH(payment_date) = MONTH(GETDATE())
             AND YEAR(payment_date) = YEAR(GETDATE())
             AND deleted_at IS NULL)
          -
          (SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL(18,2))), 0) FROM financial_titles
           WHERE organization_id = @orgId AND branch_id = @branchId
             AND type = 'PAYABLE' AND status = 'PAID'
             AND MONTH(payment_date) = MONTH(GETDATE())
             AND YEAR(payment_date) = YEAR(GETDATE())
             AND deleted_at IS NULL)
        , 0) as value
    `,
    'margin.gross': `
      SELECT 
        CASE 
          WHEN COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' THEN CAST(total_amount AS DECIMAL(18,2)) ELSE 0 END), 0) > 0 
          THEN (
            (SUM(CASE WHEN type = 'RECEIVABLE' THEN CAST(total_amount AS DECIMAL(18,2)) ELSE 0 END) 
             - SUM(CASE WHEN type = 'PAYABLE' THEN CAST(total_amount AS DECIMAL(18,2)) ELSE 0 END))
            / SUM(CASE WHEN type = 'RECEIVABLE' THEN CAST(total_amount AS DECIMAL(18,2)) ELSE 0 END)
          ) * 100
          ELSE 0
        END as value
      FROM financial_titles
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND status = 'PAID'
        AND MONTH(payment_date) = MONTH(GETDATE())
        AND YEAR(payment_date) = YEAR(GETDATE())
        AND deleted_at IS NULL
    `,
    'cash.balance': `
      SELECT COALESCE(SUM(CAST(current_balance AS DECIMAL(18,2))), 0) as value
      FROM bank_accounts
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND is_active = 1
        AND deleted_at IS NULL
    `,
    'receivables.overdue': `
      SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL(18,2))), 0) as value
      FROM financial_titles
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND type = 'RECEIVABLE'
        AND status = 'PENDING'
        AND due_date < GETDATE()
        AND deleted_at IS NULL
    `,
  };

  async executeQuery(
    query: string,
    organizationId: number,
    branchId: number
  ): Promise<KPIDataPoint | null> {
    const queryTemplate = this.queries[query];

    if (!queryTemplate) {
      console.warn(`[FinancialKPIDataSource] Query não encontrada: ${query}`);
      return null;
    }

    try {
      const sqlQuery = queryTemplate
        .replace(/@orgId/g, String(organizationId))
        .replace(/@branchId/g, String(branchId));

      const result = await db.execute(sql.raw(sqlQuery));
      const rows = (result.recordset || result) as unknown as Array<{ value: number | null }>;

      if (rows.length === 0 || rows[0].value === null) {
        return null;
      }

      return {
        value: Number(rows[0].value),
        periodDate: new Date(),
        metadata: { query, source: 'financial' },
      };
    } catch (error) {
      console.error(`[FinancialKPIDataSource] Erro ao executar query ${query}:`, error);
      return null;
    }
  }

  getAvailableQueries(): { id: string; name: string; description: string }[] {
    return [
      { id: 'revenue.monthly', name: 'Receita Mensal', description: 'Receita total recebida no mês corrente' },
      { id: 'ebitda.monthly', name: 'EBITDA Mensal', description: 'Receitas menos despesas do mês' },
      { id: 'margin.gross', name: 'Margem Bruta', description: 'Margem bruta percentual do mês' },
      { id: 'cash.balance', name: 'Saldo em Caixa', description: 'Saldo atual das contas bancárias' },
      { id: 'receivables.overdue', name: 'Recebíveis em Atraso', description: 'Total de contas a receber vencidas' },
    ];
  }
}
