/**
 * Variance Analysis Service
 *
 * Serviço para análise de variância entre valores ACTUAL, BUDGET e FORECAST.
 * Implementa comparações e cálculos de performance vs orçamento/previsão.
 *
 * Referência: SAP BPC Variance Reports, Oracle EPBCS
 * @see GAP-Q03
 */

import { db, getFirstRow, getDbRows } from '@/lib/db';
import { sql } from 'drizzle-orm';

export type VarianceStatus = 'FAVORABLE' | 'ACCEPTABLE' | 'UNFAVORABLE';
export type VersionType = 'ACTUAL' | 'BUDGET' | 'FORECAST';

export interface VarianceResult {
  kpiId: string;
  kpiCode: string;
  kpiName: string;
  periodYear: number;
  periodMonth: number;
  actual: number | null;
  budget: number | null;
  forecast: number | null;
  varianceActualBudget: number;
  varianceActualBudgetPct: number;
  varianceActualForecast: number;
  varianceActualForecastPct: number;
  status: VarianceStatus;
}

export interface VarianceSummary {
  totalKPIs: number;
  favorable: number;
  acceptable: number;
  unfavorable: number;
  avgVariancePct: number;
}

export class VarianceAnalysisService {
  /**
   * Obtém análise de variância de KPIs
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   * @param options - Filtros de período e KPI
   */
  async getKPIVariance(
    organizationId: number,
    branchId: number,
    options: {
      year: number;
      month?: number;
      kpiId?: string;
      goalId?: string;
    }
  ): Promise<VarianceResult[]> {
    const conditions = [
      sql`organization_id = ${organizationId}`,
      sql`branch_id = ${branchId}`,
      sql`period_year = ${options.year}`,
    ];

    if (options.month) {
      conditions.push(sql`period_month = ${options.month}`);
    }
    if (options.kpiId) {
      conditions.push(sql`kpi_id = ${options.kpiId}`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    const result = await db.execute(sql`
      SELECT * FROM vw_kpi_variance_analysis
      WHERE ${whereClause}
      ORDER BY period_year DESC, period_month DESC, kpi_code
    `);

    return getDbRows(result).map(row => ({
      kpiId: row.kpi_id,
      kpiCode: row.kpi_code,
      kpiName: row.kpi_name,
      periodYear: row.period_year,
      periodMonth: row.period_month,
      actual: row.actual_value,
      budget: row.budget_value,
      forecast: row.forecast_value,
      varianceActualBudget: row.variance_actual_budget,
      varianceActualBudgetPct: row.variance_actual_budget_pct,
      varianceActualForecast: row.variance_actual_forecast,
      varianceActualForecastPct: row.variance_actual_forecast_pct,
      status: row.variance_status,
    }));
  }

  /**
   * Obtém resumo de variâncias
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   * @param year - Ano
   * @param month - Mês (opcional)
   */
  async getVarianceSummary(
    organizationId: number,
    branchId: number,
    year: number,
    month?: number
  ): Promise<VarianceSummary> {
    const monthCondition = month ? sql`AND period_month = ${month}` : sql``;

    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total_kpis,
        SUM(CASE WHEN variance_status = 'FAVORABLE' THEN 1 ELSE 0 END) as favorable,
        SUM(CASE WHEN variance_status = 'ACCEPTABLE' THEN 1 ELSE 0 END) as acceptable,
        SUM(CASE WHEN variance_status = 'UNFAVORABLE' THEN 1 ELSE 0 END) as unfavorable,
        AVG(ABS(variance_actual_budget_pct)) as avg_variance_pct
      FROM vw_kpi_variance_analysis
      WHERE organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND period_year = ${year}
        ${monthCondition}
    `);

    const row = getFirstRow(result);
    return {
      totalKPIs: row?.total_kpis || 0,
      favorable: row?.favorable || 0,
      acceptable: row?.acceptable || 0,
      unfavorable: row?.unfavorable || 0,
      avgVariancePct: row?.avg_variance_pct || 0,
    };
  }

  /**
   * Salva valor de versão (ACTUAL, BUDGET ou FORECAST)
   * Usa MERGE para upsert automático
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   * @param data - Dados do valor
   */
  async saveVersionValue(
    organizationId: number,
    branchId: number,
    data: {
      kpiId: string;
      versionType: VersionType;
      year: number;
      month: number;
      value: number;
      notes?: string;
      createdBy: string;
    }
  ): Promise<void> {
    const id = crypto.randomUUID();

    // Upsert - se já existir para o mesmo período/versão, atualiza
    await db.execute(sql`
      MERGE INTO strategic_kpi_value_version AS target
      USING (SELECT
        ${id} as id,
        ${organizationId} as organization_id,
        ${branchId} as branch_id,
        ${data.kpiId} as kpi_id,
        ${data.versionType} as version_type,
        ${data.year} as period_year,
        ${data.month} as period_month,
        ${data.value} as value,
        ${data.notes || null} as notes,
        ${data.createdBy} as created_by
      ) AS source
      ON target.kpi_id = source.kpi_id
        AND target.version_type = source.version_type
        AND target.period_year = source.period_year
        AND target.period_month = source.period_month
        AND target.deleted_at IS NULL
      WHEN MATCHED THEN
        UPDATE SET
          value = source.value,
          notes = source.notes,
          updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (id, organization_id, branch_id, kpi_id, version_type, period_year, period_month, value, notes, created_by)
        VALUES (source.id, source.organization_id, source.branch_id, source.kpi_id, source.version_type, source.period_year, source.period_month, source.value, source.notes, source.created_by);
    `);
  }
}
