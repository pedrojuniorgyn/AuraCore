/**
 * Query: GetBSCDashboardQuery
 * Dashboard BSC enterprise-grade consumindo views SQL, Time Intelligence e Variance Analysis
 *
 * Integração:
 * - Task 01: Views SQL otimizadas
 * - Task 02: Time Intelligence (YTD, MTD, QTD, YoY, MoM, QoQ)
 * - Task 03: Variance Analysis (ACTUAL vs BUDGET vs FORECAST)
 *
 * @module strategic/application/queries
 */

import { inject, injectable } from 'tsyringe';
import { db, getFirstRow, getDbRows } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { IStrategyRepository } from '../../domain/ports/output/IStrategyRepository';
import { TimeIntelligence, TimePeriod, ComparisonType } from '@/shared/infrastructure/time/TimeIntelligence';
import { VarianceAnalysisService } from '../services/VarianceAnalysisService';

export interface BSCDashboardInput {
  organizationId: number;
  branchId: number;
  strategyId?: string;
  period?: TimePeriod;
  comparison?: ComparisonType;
}

export interface PerspectiveSummary {
  perspectiveId: string;
  perspectiveName: string;
  totalGoals: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  achieved: number;
  avgCompletion: number;
  weight: number;
}

export interface KPISummary {
  total: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  topPerformers: Array<{
    id: string;
    code: string;
    name: string;
    achievementPct: number;
  }>;
  bottomPerformers: Array<{
    id: string;
    code: string;
    name: string;
    achievementPct: number;
  }>;
}

export interface ActionPlanSummary {
  total: number;
  byStatus: Record<string, number>;
  overdue: number;
  avgCompletion: number;
  completionTrend: {
    current: number;
    previous: number;
    variance: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  };
}

export interface BSCDashboardOutput {
  strategy: {
    id: string;
    name: string;
    status: string;
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
    overallProgress: number;
  } | null;
  perspectives: PerspectiveSummary[];
  kpis: KPISummary;
  actionPlans: ActionPlanSummary;
  gerot: {
    controlItems: {
      total: number;
      normal: number;
      outOfRange: number;
    };
    anomalies: {
      open: number;
      bySeverity: Record<string, number>;
    };
  };
  variance: {
    summary: {
      favorable: number;
      acceptable: number;
      unfavorable: number;
    };
    avgVariancePct: number;
  };
  lastUpdated: Date;
}

export interface IGetBSCDashboardUseCase {
  execute(input: BSCDashboardInput): Promise<BSCDashboardOutput>;
}

@injectable()
export class GetBSCDashboardQuery implements IGetBSCDashboardUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategyRepository)
    private readonly strategyRepo: IStrategyRepository
  ) {}

  async execute(input: BSCDashboardInput): Promise<BSCDashboardOutput> {
    const { organizationId, branchId, strategyId, period = 'YTD', comparison = 'YoY' } = input;

    // 1. Buscar estratégia ativa ou específica
    let strategy = null;
    if (strategyId) {
      strategy = await this.strategyRepo.findById(strategyId, organizationId, branchId);
    } else {
      strategy = await this.strategyRepo.findActive(organizationId, branchId);
    }

    // 2. Buscar resumo por perspectiva (view da Task 01)
    const perspectivesResult = await db.execute(sql`
      SELECT * FROM vw_strategic_goals_summary
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
      ORDER BY perspective_name
    `);

    const perspectives: PerspectiveSummary[] = getDbRows(perspectivesResult).map(row => ({
      perspectiveId: row.perspective_id,
      perspectiveName: row.perspective_name,
      totalGoals: row.total_goals,
      onTrack: row.on_track_count,
      atRisk: row.at_risk_count,
      critical: row.critical_count,
      achieved: row.achieved_count,
      avgCompletion: row.avg_completion_pct || 0,
      weight: row.avg_weight || 0,
    }));

    // 3. Buscar performance de KPIs (view da Task 01)
    const kpisResult = await db.execute(sql`
      SELECT * FROM vw_kpi_performance
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
      ORDER BY achievement_pct DESC
    `);

    const kpiRows = getDbRows(kpisResult);
    const kpis: KPISummary = {
      total: kpiRows.length,
      onTrack: kpiRows.filter(k => k.calculated_status === 'ON_TRACK').length,
      atRisk: kpiRows.filter(k => k.calculated_status === 'AT_RISK').length,
      critical: kpiRows.filter(k => k.calculated_status === 'CRITICAL').length,
      topPerformers: kpiRows.slice(0, 5).map(k => ({
        id: k.kpi_id,
        code: k.code,
        name: k.name,
        achievementPct: k.achievement_pct || 0,
      })),
      bottomPerformers: kpiRows.slice(-5).reverse().map(k => ({
        id: k.kpi_id,
        code: k.code,
        name: k.name,
        achievementPct: k.achievement_pct || 0,
      })),
    };

    // 4. Buscar Action Plans Kanban (view da Task 01)
    const actionPlansResult = await db.execute(sql`
      SELECT * FROM vw_action_plans_kanban
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
    `);

    const apRows = getDbRows(actionPlansResult);
    const byStatus: Record<string, number> = {};
    let totalPlans = 0;
    let totalOverdue = 0;
    let totalCompletion = 0;

    apRows.forEach(row => {
      byStatus[row.status] = row.total_plans;
      totalPlans += row.total_plans;
      totalOverdue += row.overdue_count;
      totalCompletion += row.avg_completion * row.total_plans;
    });

    // Time comparison para action plans (Task 02)
    const timeRange = TimeIntelligence.getComparison(period, comparison);

    const actionPlans: ActionPlanSummary = {
      total: totalPlans,
      byStatus,
      overdue: totalOverdue,
      avgCompletion: totalPlans > 0 ? totalCompletion / totalPlans : 0,
      completionTrend: {
        current: totalPlans > 0 ? totalCompletion / totalPlans : 0,
        previous: 0, // TODO: calcular do período anterior
        variance: 0,
        trend: 'STABLE',
      },
    };

    // 5. Buscar GEROT status (view da Task 01)
    const controlItemsResult = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN limit_status = 'NORMAL' THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN limit_status = 'OUT_OF_RANGE' THEN 1 ELSE 0 END) as out_of_range
      FROM vw_control_items_status
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
    `);

    const anomaliesResult = await db.execute(sql`
      SELECT severity, SUM(total_count) as count
      FROM vw_anomalies_summary
      WHERE organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND status = 'OPEN'
      GROUP BY severity
    `);

    const ciRow = getFirstRow(controlItemsResult);
    const anomalyRows = getDbRows(anomaliesResult);
    const bySeverity: Record<string, number> = {};
    let openAnomalies = 0;
    anomalyRows.forEach(row => {
      bySeverity[row.severity] = row.count;
      openAnomalies += row.count;
    });

    // 6. Variance Analysis (Task 03)
    const varianceService = new VarianceAnalysisService();
    const varianceSummary = await varianceService.getVarianceSummary(
      organizationId,
      branchId,
      new Date().getFullYear(),
      new Date().getMonth() + 1
    );

    // 7. Calcular progresso geral
    const overallProgress = perspectives.length > 0
      ? perspectives.reduce((acc, p) => acc + p.avgCompletion * p.weight, 0) /
        perspectives.reduce((acc, p) => acc + p.weight, 0)
      : 0;

    // 8. Montar resposta
    return {
      strategy: strategy ? {
        id: strategy.id,
        name: strategy.name,
        status: strategy.status,
        startDate: strategy.startDate,
        endDate: strategy.endDate,
        daysRemaining: Math.ceil(
          (strategy.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
        overallProgress,
      } : null,
      perspectives,
      kpis,
      actionPlans,
      gerot: {
        controlItems: {
          total: ciRow?.total || 0,
          normal: ciRow?.normal || 0,
          outOfRange: ciRow?.out_of_range || 0,
        },
        anomalies: {
          open: openAnomalies,
          bySeverity,
        },
      },
      variance: {
        summary: {
          favorable: varianceSummary.favorable,
          acceptable: varianceSummary.acceptable,
          unfavorable: varianceSummary.unfavorable,
        },
        avgVariancePct: varianceSummary.avgVariancePct,
      },
      lastUpdated: new Date(),
    };
  }
}
