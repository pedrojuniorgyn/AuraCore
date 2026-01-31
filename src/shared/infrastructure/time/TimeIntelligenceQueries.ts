/**
 * Time Intelligence Query Builder
 *
 * Queries SQL para análises temporais com comparações período-a-período.
 * Suporta KPIs, Goals e Action Plans.
 */

import { db, getFirstRow } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { TimeIntelligence, TimePeriod, ComparisonType } from './TimeIntelligence';

export const TimeIntelligenceQueries = {
  /**
   * Get KPI values with time comparison
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   * @param kpiId - ID do KPI
   * @param period - Período de análise
   * @param comparison - Tipo de comparação
   */
  async getKPIWithComparison(
    organizationId: number,
    branchId: number,
    kpiId: string,
    period: TimePeriod,
    comparison: ComparisonType
  ) {
    const { current, previous } = TimeIntelligence.getComparison(period, comparison);

    // Current period value
    const currentResult = await db.execute(sql`
      SELECT
        AVG(CAST(value AS FLOAT)) as avg_value,
        MAX(CAST(value AS FLOAT)) as max_value,
        MIN(CAST(value AS FLOAT)) as min_value,
        COUNT(*) as measurement_count
      FROM strategic_kpi_measurement
      WHERE kpi_id = ${kpiId}
        AND organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND measured_at >= ${TimeIntelligence.toSQLDate(current.start)}
        AND measured_at <= ${TimeIntelligence.toSQLDate(current.end)}
        AND deleted_at IS NULL
    `);

    // Previous period value
    const previousResult = await db.execute(sql`
      SELECT
        AVG(CAST(value AS FLOAT)) as avg_value,
        MAX(CAST(value AS FLOAT)) as max_value,
        MIN(CAST(value AS FLOAT)) as min_value,
        COUNT(*) as measurement_count
      FROM strategic_kpi_measurement
      WHERE kpi_id = ${kpiId}
        AND organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND measured_at >= ${TimeIntelligence.toSQLDate(previous.start)}
        AND measured_at <= ${TimeIntelligence.toSQLDate(previous.end)}
        AND deleted_at IS NULL
    `);

    const currentRow = getFirstRow(currentResult);
    const previousRow = getFirstRow(previousResult);

    const currentValue = currentRow?.avg_value || 0;
    const previousValue = previousRow?.avg_value || 0;

    return {
      current: {
        period: current.label,
        ...currentRow,
      },
      previous: {
        period: previous.label,
        ...previousRow,
      },
      variance: TimeIntelligence.calculateVariance(currentValue, previousValue),
    };
  },

  /**
   * Get Goals progress over time
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   * @param period - Período de análise
   * @param granularity - Granularidade (DAY, WEEK, MONTH)
   */
  async getGoalsProgressTimeline(
    organizationId: number,
    branchId: number,
    period: TimePeriod,
    granularity: 'DAY' | 'WEEK' | 'MONTH' = 'MONTH'
  ) {
    const range = TimeIntelligence.getRange(period);
    const dateFormat = granularity === 'DAY' ? 'yyyy-MM-dd' : granularity === 'WEEK' ? 'yyyy-\\Www' : 'yyyy-MM';

    return db.execute(sql`
      SELECT
        FORMAT(updated_at, ${dateFormat}) as period,
        COUNT(*) as total_goals,
        AVG(CAST(current_value AS FLOAT) / NULLIF(CAST(target_value AS FLOAT), 0) * 100) as avg_progress,
        SUM(CASE WHEN status = 'ACHIEVED' THEN 1 ELSE 0 END) as achieved_count
      FROM strategic_goal
      WHERE organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND updated_at >= ${TimeIntelligence.toSQLDate(range.start)}
        AND updated_at <= ${TimeIntelligence.toSQLDate(range.end)}
        AND deleted_at IS NULL
      GROUP BY FORMAT(updated_at, ${dateFormat})
      ORDER BY period
    `);
  },

  /**
   * Get Action Plans completion rate by period
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   * @param period - Período de análise
   * @param comparison - Tipo de comparação
   */
  async getActionPlanCompletionRate(
    organizationId: number,
    branchId: number,
    period: TimePeriod,
    comparison: ComparisonType
  ) {
    const { current, previous } = TimeIntelligence.getComparison(period, comparison);

    const getCompletionRate = async (range: typeof current) => {
      const result = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN when_deadline < GETDATE() AND status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 ELSE 0 END) as overdue
        FROM strategic_action_plan
        WHERE organization_id = ${organizationId}
          AND branch_id = ${branchId}
          AND created_at >= ${TimeIntelligence.toSQLDate(range.start)}
          AND created_at <= ${TimeIntelligence.toSQLDate(range.end)}
          AND deleted_at IS NULL
      `);
      const row = getFirstRow(result);
      const total = row?.total || 0;
      const completed = row?.completed || 0;
      const overdue = row?.overdue || 0;
      return {
        total,
        completed,
        overdue,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
      };
    };

    const currentData = await getCompletionRate(current);
    const previousData = await getCompletionRate(previous);

    return {
      current: { period: current.label, ...currentData },
      previous: { period: previous.label, ...previousData },
      variance: TimeIntelligence.calculateVariance(currentData.completionRate, previousData.completionRate),
    };
  },
};
