/**
 * Query: GetDrilldownQuery
 * Navegação hierárquica (drill-down) no dashboard BSC
 *
 * @module strategic/application/queries
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db, getDbRows } from '@/lib/db';
import { sql } from 'drizzle-orm';

export type DrilldownLevel = 'strategy' | 'perspective' | 'goal' | 'kpi';

// Database row types
interface PerspectiveRow {
  id: string;
  name: string;
  description: string | null;
  orderIndex: number;
  goalCount: number;
  kpiCount: number;
  avgProgress: number;
}

interface GoalRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  perspectiveId: string;
  perspectiveName: string;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  progress: number;
  kpiCount: number;
  actionPlanCount: number;
  overdueActionPlans: number;
}

interface KPIRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  goalId: string;
  goalCode: string;
  goalName: string;
  targetValue: number;
  currentValue: number | null;
  unit: string;
  polarity: string;
  progress: number;
  trend: string | null;
}

interface KPIDetailRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  goalId: string;
  goalName: string;
  unit: string;
  polarity: string;
  currentValue: number | null;
  targetValue: number | null;
  baselineValue: number | null;
  lastUpdated: Date;
}

interface KPIValueRow {
  period: string;
  actual: number | null;
  budget: number | null;
  forecast: number | null;
}

interface ActionPlanRow {
  id: string;
  what: string;
  status: string;
  dueDate: Date;
  isOverdue: number;
}

export interface DrilldownParams {
  organizationId: number;
  branchId: number;
  level: DrilldownLevel;
  parentId?: string;
  strategyId: string;
}

export interface PerspectiveDrilldown {
  id: string;
  name: string;
  description: string | null;
  orderIndex: number;
  goalCount: number;
  kpiCount: number;
  avgProgress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
}

export interface GoalDrilldown {
  id: string;
  code: string;
  name: string;
  description: string | null;
  perspectiveId: string;
  perspectiveName: string;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
  kpiCount: number;
  actionPlanCount: number;
  overdueActionPlans: number;
}

export interface KPIDrilldown {
  id: string;
  code: string;
  name: string;
  description: string | null;
  goalId: string;
  goalName: string;
  unit: string | null;
  polarity: 'UP' | 'DOWN';
  currentValue: number | null;
  targetValue: number | null;
  baselineValue: number | null;
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercent: number;
  lastUpdated: Date | null;
}

export interface KPIDetailDrilldown {
  kpi: KPIDrilldown;
  values: Array<{
    period: string;
    actual: number | null;
    budget: number | null;
    forecast: number | null;
    variance: number | null;
    variancePercent: number | null;
  }>;
  actionPlans: Array<{
    id: string;
    what: string;
    status: string;
    dueDate: Date | null;
    isOverdue: boolean;
  }>;
}

@injectable()
export class GetDrilldownQuery {
  async getPerspectives(
    params: DrilldownParams
  ): Promise<Result<PerspectiveDrilldown[], string>> {
    const { organizationId, branchId, strategyId } = params;

    const query = sql`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.order_index as orderIndex,
        COUNT(DISTINCT g.id) as goalCount,
        COUNT(DISTINCT k.id) as kpiCount,
        COALESCE(AVG(
          CASE 
            WHEN k.target_value IS NOT NULL AND k.target_value != 0 
            THEN (CAST(k.current_value AS FLOAT) / CAST(k.target_value AS FLOAT)) * 100
            ELSE NULL
          END
        ), 0) as avgProgress
      FROM bsc_perspective p
      LEFT JOIN strategic_goal g ON g.perspective_id = p.id 
        AND g.organization_id = ${organizationId}
        AND g.branch_id = ${branchId}
        AND g.deleted_at IS NULL
      LEFT JOIN strategic_kpi k ON k.goal_id = g.id
        AND k.organization_id = ${organizationId}
        AND k.branch_id = ${branchId}
        AND k.deleted_at IS NULL
      WHERE p.organization_id = ${organizationId}
        AND p.branch_id = ${branchId}
        AND p.strategy_id = ${strategyId}
        AND p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.description, p.order_index
      ORDER BY p.order_index
    `;

    const result = await db.execute(query);
    const rows = getDbRows(result);

    return Result.ok(
      rows.map((row: PerspectiveRow) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        orderIndex: Number(row.orderIndex),
        goalCount: Number(row.goalCount),
        kpiCount: Number(row.kpiCount),
        avgProgress: Number(row.avgProgress),
        status: this.calculateStatus(Number(row.avgProgress)),
      }))
    );
  }

  async getGoals(
    params: DrilldownParams
  ): Promise<Result<GoalDrilldown[], string>> {
    const { organizationId, branchId, parentId } = params;

    if (!parentId) {
      return Result.fail('perspectiveId is required for goal drilldown');
    }

    const query = sql`
      SELECT 
        g.id,
        g.code,
        g.name,
        g.description,
        g.perspective_id as perspectiveId,
        p.name as perspectiveName,
        g.target_value as targetValue,
        g.current_value as currentValue,
        g.unit,
        CASE 
          WHEN g.target_value IS NOT NULL AND g.target_value != 0 
          THEN (CAST(g.current_value AS FLOAT) / CAST(g.target_value AS FLOAT)) * 100
          ELSE 0
        END as progress,
        COUNT(DISTINCT k.id) as kpiCount,
        COUNT(DISTINCT ap.id) as actionPlanCount,
        COUNT(DISTINCT CASE 
          WHEN ap.when_end < GETDATE() AND ap.status NOT IN ('COMPLETED', 'CANCELLED')
          THEN ap.id 
        END) as overdueActionPlans
      FROM strategic_goal g
      INNER JOIN bsc_perspective p ON p.id = g.perspective_id
      LEFT JOIN strategic_kpi k ON k.goal_id = g.id
        AND k.organization_id = ${organizationId}
        AND k.branch_id = ${branchId}
        AND k.deleted_at IS NULL
      LEFT JOIN strategic_action_plan ap ON ap.goal_id = g.id
        AND ap.organization_id = ${organizationId}
        AND ap.branch_id = ${branchId}
        AND ap.deleted_at IS NULL
      WHERE g.organization_id = ${organizationId}
        AND g.branch_id = ${branchId}
        AND g.perspective_id = ${parentId}
        AND g.deleted_at IS NULL
      GROUP BY g.id, g.code, g.name, g.description, g.perspective_id, 
               p.name, g.target_value, g.current_value, g.unit
      ORDER BY g.code
    `;

    const result = await db.execute(query);
    const rows = getDbRows(result);

    return Result.ok(
      rows.map((row: GoalRow) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        perspectiveId: row.perspectiveId,
        perspectiveName: row.perspectiveName,
        targetValue: row.targetValue ? Number(row.targetValue) : null,
        currentValue: row.currentValue ? Number(row.currentValue) : null,
        unit: row.unit,
        progress: Number(row.progress),
        status: this.calculateStatus(Number(row.progress)),
        kpiCount: Number(row.kpiCount),
        actionPlanCount: Number(row.actionPlanCount),
        overdueActionPlans: Number(row.overdueActionPlans),
      }))
    );
  }

  async getKPIs(
    params: DrilldownParams
  ): Promise<Result<KPIDrilldown[], string>> {
    const { organizationId, branchId, parentId } = params;

    if (!parentId) {
      return Result.fail('goalId is required for KPI drilldown');
    }

    const query = sql`
      SELECT 
        k.id,
        k.code,
        k.name,
        k.description,
        k.goal_id as goalId,
        g.name as goalName,
        k.unit,
        k.polarity,
        k.current_value as currentValue,
        k.target_value as targetValue,
        k.baseline_value as baselineValue,
        CASE 
          WHEN k.target_value IS NOT NULL AND k.target_value != 0 
          THEN (CAST(k.current_value AS FLOAT) / CAST(k.target_value AS FLOAT)) * 100
          ELSE 0
        END as progress,
        k.updated_at as lastUpdated
      FROM strategic_kpi k
      INNER JOIN strategic_goal g ON g.id = k.goal_id
      WHERE k.organization_id = ${organizationId}
        AND k.branch_id = ${branchId}
        AND k.goal_id = ${parentId}
        AND k.deleted_at IS NULL
      ORDER BY k.code
    `;

    const result = await db.execute(query);
    const rows = getDbRows(result);

    return Result.ok(
      rows.map((row: KPIRow) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        goalId: row.goalId,
        goalName: row.goalName,
        unit: row.unit,
        polarity: row.polarity,
        currentValue: row.currentValue ? Number(row.currentValue) : null,
        targetValue: row.targetValue ? Number(row.targetValue) : null,
        baselineValue: row.baselineValue ? Number(row.baselineValue) : null,
        progress: Number(row.progress),
        status: this.calculateStatus(Number(row.progress)),
        trend: 'STABLE' as const,
        trendPercent: 0,
        lastUpdated: row.lastUpdated ? new Date(row.lastUpdated) : null,
      }))
    );
  }

  async getKPIDetail(
    organizationId: number,
    branchId: number,
    kpiId: string,
    months: number = 12
  ): Promise<Result<KPIDetailDrilldown, string>> {
    // Get KPI info
    const kpiQuery = sql`
      SELECT 
        k.id, k.code, k.name, k.description, k.goal_id as goalId,
        g.name as goalName, k.unit, k.polarity, k.current_value as currentValue,
        k.target_value as targetValue, k.baseline_value as baselineValue,
        k.updated_at as lastUpdated
      FROM strategic_kpi k
      INNER JOIN strategic_goal g ON g.id = k.goal_id
      WHERE k.id = ${kpiId}
        AND k.organization_id = ${organizationId}
        AND k.branch_id = ${branchId}
        AND k.deleted_at IS NULL
    `;

    const kpiResult = await db.execute(kpiQuery);
    const kpiRows = getDbRows(kpiResult) as KPIDetailRow[];

    if (kpiRows.length === 0) {
      return Result.fail('KPI not found');
    }

    const kpiRow = kpiRows[0] as KPIDetailRow;

    // Get values by period
    const valuesQuery = sql`
      SELECT 
        CONCAT(period_year, '-', RIGHT('0' + CAST(period_month AS VARCHAR), 2)) as period,
        MAX(CASE WHEN version_type = 'ACTUAL' THEN value END) as actual,
        MAX(CASE WHEN version_type = 'BUDGET' THEN value END) as budget,
        MAX(CASE WHEN version_type = 'FORECAST' THEN value END) as forecast
      FROM strategic_kpi_value_version
      WHERE kpi_id = ${kpiId}
        AND organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND deleted_at IS NULL
      GROUP BY period_year, period_month
      ORDER BY period_year DESC, period_month DESC
      OFFSET 0 ROWS FETCH NEXT ${months} ROWS ONLY
    `;

    const valuesResult = await db.execute(valuesQuery);
    const values = getDbRows(valuesResult) as KPIValueRow[];

    // Get related action plans
    const plansQuery = sql`
      SELECT id, what, status, when_end as dueDate,
        CASE WHEN when_end < GETDATE() AND status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 ELSE 0 END as isOverdue
      FROM strategic_action_plan
      WHERE goal_id IN (SELECT goal_id FROM strategic_kpi WHERE id = ${kpiId})
        AND organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND deleted_at IS NULL
      ORDER BY when_end
    `;

    const plansResult = await db.execute(plansQuery);
    const plans = getDbRows(plansResult) as ActionPlanRow[];

    const progress =
      kpiRow.targetValue && kpiRow.targetValue !== 0
        ? (Number(kpiRow.currentValue) / Number(kpiRow.targetValue)) * 100
        : 0;

    return Result.ok({
      kpi: {
        id: kpiRow.id,
        code: kpiRow.code,
        name: kpiRow.name,
        description: kpiRow.description,
        goalId: kpiRow.goalId,
        goalName: kpiRow.goalName,
        unit: kpiRow.unit,
        polarity: kpiRow.polarity,
        currentValue: kpiRow.currentValue ? Number(kpiRow.currentValue) : null,
        targetValue: kpiRow.targetValue ? Number(kpiRow.targetValue) : null,
        baselineValue: kpiRow.baselineValue ? Number(kpiRow.baselineValue) : null,
        progress,
        status: this.calculateStatus(progress),
        trend: 'STABLE' as const,
        trendPercent: 0,
        lastUpdated: kpiRow.lastUpdated ? new Date(kpiRow.lastUpdated) : null,
      },
      values: values.map((v: KPIValueRow) => {
        const actual = v.actual ? Number(v.actual) : null;
        const budget = v.budget ? Number(v.budget) : null;
        const variance = actual !== null && budget !== null ? actual - budget : null;
        const variancePercent =
          variance !== null && budget !== null && budget !== 0
            ? (variance / budget) * 100
            : null;

        return {
          period: v.period,
          actual,
          budget,
          forecast: v.forecast ? Number(v.forecast) : null,
          variance,
          variancePercent,
        };
      }),
      actionPlans: plans.map((p: ActionPlanRow) => ({
        id: p.id,
        what: p.what,
        status: p.status,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        isOverdue: Boolean(p.isOverdue),
      })),
    });
  }

  private calculateStatus(
    progress: number
  ): 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' {
    if (progress >= 85) return 'ON_TRACK';
    if (progress >= 70) return 'AT_RISK';
    return 'CRITICAL';
  }
}
