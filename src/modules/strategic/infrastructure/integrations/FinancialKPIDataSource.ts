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
    // Receita mensal: soma de recebimentos RECEBIDOS no mês corrente
    // NOTA: accounts_receivable usa 'RECEIVED' (não 'PAID') - ver schema linha 746
    'revenue.monthly': `
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0) as value
      FROM accounts_receivable
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND status = 'RECEIVED'
        AND MONTH(receive_date) = MONTH(GETDATE())
        AND YEAR(receive_date) = YEAR(GETDATE())
        AND deleted_at IS NULL
    `,
    // EBITDA mensal: receitas - despesas do mês corrente
    // accounts_receivable usa 'RECEIVED', accounts_payable usa 'PAID'
    'ebitda.monthly': `
      SELECT 
        COALESCE(
          (SELECT COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0) FROM accounts_receivable 
           WHERE organization_id = @orgId AND branch_id = @branchId
             AND status = 'RECEIVED' 
             AND MONTH(receive_date) = MONTH(GETDATE())
             AND YEAR(receive_date) = YEAR(GETDATE())
             AND deleted_at IS NULL)
          -
          (SELECT COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0) FROM accounts_payable
           WHERE organization_id = @orgId AND branch_id = @branchId
             AND status = 'PAID'
             AND MONTH(pay_date) = MONTH(GETDATE())
             AND YEAR(pay_date) = YEAR(GETDATE())
             AND deleted_at IS NULL)
        , 0) as value
    `,
    // Margem bruta: (receitas - despesas) / receitas * 100
    // COALESCE no denominador para evitar divisão por NULL
    'margin.gross': `
      SELECT 
        CASE 
          WHEN COALESCE(
            (SELECT SUM(CAST(amount AS DECIMAL(18,2))) FROM accounts_receivable 
             WHERE organization_id = @orgId AND branch_id = @branchId
               AND status = 'RECEIVED'
               AND MONTH(receive_date) = MONTH(GETDATE())
               AND YEAR(receive_date) = YEAR(GETDATE())
               AND deleted_at IS NULL), 0) > 0 
          THEN (
            (SELECT COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0) FROM accounts_receivable 
             WHERE organization_id = @orgId AND branch_id = @branchId
               AND status = 'RECEIVED'
               AND MONTH(receive_date) = MONTH(GETDATE())
               AND YEAR(receive_date) = YEAR(GETDATE())
               AND deleted_at IS NULL)
            -
            (SELECT COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0) FROM accounts_payable 
             WHERE organization_id = @orgId AND branch_id = @branchId
               AND status = 'PAID'
               AND MONTH(pay_date) = MONTH(GETDATE())
               AND YEAR(pay_date) = YEAR(GETDATE())
               AND deleted_at IS NULL)
          ) / COALESCE(
            (SELECT SUM(CAST(amount AS DECIMAL(18,2))) FROM accounts_receivable 
             WHERE organization_id = @orgId AND branch_id = @branchId
               AND status = 'RECEIVED'
               AND MONTH(receive_date) = MONTH(GETDATE())
               AND YEAR(receive_date) = YEAR(GETDATE())
               AND deleted_at IS NULL), 1
          ) * 100
          ELSE 0
        END as value
    `,
    // Saldo em caixa: soma dos saldos das contas bancárias ativas
    'cash.balance': `
      SELECT COALESCE(SUM(CAST(current_balance AS DECIMAL(18,2))), 0) as value
      FROM bank_accounts
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND is_active = 1
        AND deleted_at IS NULL
    `,
    // Recebíveis em atraso: contas a receber não-terminais com vencimento passado
    // Status válidos: OPEN (ainda não marcado), OVERDUE (marcado explicitamente)
    // Exclui: RECEIVED, CANCELLED (terminais), PARTIAL, PROCESSING (em andamento)
    'receivables.overdue': `
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0) as value
      FROM accounts_receivable
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND status IN ('OPEN', 'OVERDUE')
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
