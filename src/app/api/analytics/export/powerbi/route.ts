/**
 * API: GET /api/analytics/export/powerbi
 * Exporta dados estratégicos em formato otimizado para Power BI
 * 
 * @module app/api/analytics/export/powerbi
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';

export interface PowerBIKPI {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  polarity: string;
  frequency: string;
  targetValue: number;
  currentValue: number;
  baselineValue: number | null;
  alertThreshold: number;
  criticalThreshold: number;
  status: string;
  achievementPercent: number;
  deviationPercent: number;
  goalId: string | null;
  ownerUserId: string;
  lastCalculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PowerBIGoal {
  id: string;
  code: string;
  description: string;
  startDate: string;
  targetMonths: number;
  progress: number;
  status: string;
  strategyId: string | null;
  cascadeLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface PowerBIStrategy {
  id: string;
  title: string;
  description: string | null;
  visionStatement: string | null;
  missionStatement: string | null;
  valuesStatement: string | null;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PowerBIActionPlan {
  id: string;
  code: string;
  what: string;
  why: string;
  who: string;
  where: string;
  whenStart: string;
  whenEnd: string;
  how: string;
  howMuch: string;
  status: string;
  pdcaCycle: string;
  goalId: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PowerBIExport {
  metadata: {
    exportedAt: string;
    organizationId: number;
    branchId: number;
    version: string;
    recordCounts: {
      kpis: number;
      goals: number;
      strategies: number;
      actionPlans: number;
    };
  };
  kpis: PowerBIKPI[];
  goals: PowerBIGoal[];
  strategies: PowerBIStrategy[];
  actionPlans: PowerBIActionPlan[];
}

export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    // Resolver repositórios
    const kpiRepository = container.resolve<IKPIRepository>(STRATEGIC_TOKENS.KPIRepository);
    const goalRepository = container.resolve<IStrategicGoalRepository>(STRATEGIC_TOKENS.StrategicGoalRepository);
    const strategyRepository = container.resolve<IStrategyRepository>(STRATEGIC_TOKENS.StrategyRepository);
    const actionPlanRepository = container.resolve<IActionPlanRepository>(STRATEGIC_TOKENS.ActionPlanRepository);

    // Buscar dados em paralelo
    const [kpisResult, goalsResult, strategiesResult, actionPlansResult] = await Promise.all([
      kpiRepository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        page: 1,
        pageSize: 10000, // Power BI pode processar grandes volumes
      }),
      goalRepository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        page: 1,
        pageSize: 10000,
      }),
      strategyRepository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        page: 1,
        pageSize: 1000,
      }),
      actionPlanRepository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        page: 1,
        pageSize: 10000,
      }),
    ]);

    // Transformar para formato Power BI
    const kpis: PowerBIKPI[] = kpisResult.items.map((kpi) => ({
      id: kpi.id,
      code: kpi.code,
      name: kpi.name,
      description: kpi.description,
      unit: kpi.unit,
      polarity: kpi.polarity,
      frequency: kpi.frequency,
      targetValue: kpi.targetValue,
      currentValue: kpi.currentValue,
      baselineValue: kpi.baselineValue,
      alertThreshold: kpi.alertThreshold,
      criticalThreshold: kpi.criticalThreshold,
      status: kpi.status,
      achievementPercent: kpi.achievementPercent,
      deviationPercent: kpi.deviationPercent,
      goalId: kpi.goalId,
      ownerUserId: kpi.ownerUserId,
      lastCalculatedAt: kpi.lastCalculatedAt?.toISOString() || null,
      createdAt: kpi.createdAt.toISOString(),
      updatedAt: kpi.updatedAt.toISOString(),
    }));

    const goals: PowerBIGoal[] = goalsResult.items.map((goal) => ({
      id: goal.id,
      code: goal.code,
      description: goal.description,
      startDate: goal.startDate.toISOString(),
      targetMonths: goal.targetMonths,
      progress: goal.progress,
      status: goal.status.value,
      strategyId: goal.strategyId,
      cascadeLevel: goal.cascadeLevel.value,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }));

    const strategies: PowerBIStrategy[] = strategiesResult.items.map((strategy) => ({
      id: strategy.id,
      title: strategy.title,
      description: strategy.description,
      visionStatement: strategy.visionStatement,
      missionStatement: strategy.missionStatement,
      valuesStatement: strategy.valuesStatement,
      startDate: strategy.startDate.toISOString(),
      endDate: strategy.endDate.toISOString(),
      status: strategy.status.value,
      isActive: strategy.isActive,
      createdAt: strategy.createdAt.toISOString(),
      updatedAt: strategy.updatedAt.toISOString(),
    }));

    const actionPlans: PowerBIActionPlan[] = actionPlansResult.items.map((plan) => ({
      id: plan.id,
      code: plan.code,
      what: plan.what,
      why: plan.why,
      who: plan.who,
      where: plan.where,
      whenStart: plan.whenStart.toISOString(),
      whenEnd: plan.whenEnd.toISOString(),
      how: plan.how,
      howMuch: plan.howMuch,
      status: plan.status,
      pdcaCycle: plan.pdcaCycle.value,
      goalId: plan.goalId,
      isOverdue: plan.isOverdue,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));

    // Montar payload final
    const payload: PowerBIExport = {
      metadata: {
        exportedAt: new Date().toISOString(),
        organizationId: context.organizationId,
        branchId: context.branchId,
        version: '1.0.0',
        recordCounts: {
          kpis: kpis.length,
          goals: goals.length,
          strategies: strategies.length,
          actionPlans: actionPlans.length,
        },
      },
      kpis,
      goals,
      strategies,
      actionPlans,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/analytics/export/powerbi error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// Enable dynamic rendering
export const dynamic = 'force-dynamic';
