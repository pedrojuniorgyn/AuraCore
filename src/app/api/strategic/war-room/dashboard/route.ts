/**
 * API: GET /api/strategic/war-room/dashboard
 * Retorna dados consolidados para o War Room
 * 
 * @module app/api/strategic/war-room
 */
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';

export async function GET() {
  try {
    const context = await getTenantContext();

    const kpiRepository = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );
    const actionPlanRepository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );
    const goalRepository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    // 1. KPIs Críticos (status = RED) - Paginação no SQL Server (ADR-0006)
    const { items: redKpis } = await kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      status: 'RED',
      page: 1,
      pageSize: 5,
    });

    const criticalKpis = redKpis.map((kpi) => ({
      id: kpi.id,
      code: kpi.code,
      name: kpi.name,
      currentValue: kpi.currentValue,
      targetValue: kpi.targetValue,
      unit: kpi.unit,
      variance: kpi.deviationPercent,
    }));

    // 2. KPIs em Alerta (status = YELLOW) - Paginação no SQL Server
    const { items: yellowKpis } = await kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      status: 'YELLOW',
      page: 1,
      pageSize: 5,
    });

    const alertKpis = yellowKpis.map((kpi) => ({
      id: kpi.id,
      code: kpi.code,
      name: kpi.name,
      currentValue: kpi.currentValue,
      targetValue: kpi.targetValue,
      unit: kpi.unit,
    }));

    // 3. Total de KPIs para estatísticas (sem paginação - count apenas)
    const { total: totalKpis, items: allKpis } = await kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 100,
    });

    // 4. Planos de ação vencidos - Paginação no SQL Server (ADR-0006)
    const now = new Date();
    const { items: overduePlanItems } = await actionPlanRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      overdueOnly: true,
      page: 1,
      pageSize: 5,
    });

    const overduePlans = overduePlanItems
      .filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED')
      .map((plan) => ({
        id: plan.id,
        code: plan.code,
        what: plan.what,
        who: plan.who,
        daysOverdue: Math.ceil(
          (now.getTime() - plan.whenEnd.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    // 5. Total de planos ativos para estatísticas
    const { items: allPlans } = await actionPlanRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    const activePlans = allPlans.filter(
      (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
    );

    // 6. Metas
    const { items: goals } = await goalRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    // 7. Estatísticas gerais
    const stats = {
      totalGoals: goals.length,
      goalsOnTrack: goals.filter((g) => g.status.value === 'ON_TRACK').length,
      goalsAtRisk: goals.filter((g) => g.status.value === 'AT_RISK').length,
      goalsDelayed: goals.filter((g) => g.status.value === 'DELAYED').length,
      totalKpis: allKpis.length,
      kpisGreen: allKpis.filter((k) => k.status === 'GREEN').length,
      kpisYellow: allKpis.filter((k) => k.status === 'YELLOW').length,
      kpisRed: allKpis.filter((k) => k.status === 'RED').length,
      totalActionPlans: activePlans.length,
      plansOverdue: overduePlans.length,
      plansInProgress: activePlans.filter((p) => p.pdcaCycle.value === 'DO').length,
    };

    // 8. Calcular saúde estratégica
    const healthScore = stats.totalKpis > 0
      ? (stats.kpisGreen / stats.totalKpis)
      : 0;

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      healthScore,
      criticalKpis,
      alertKpis,
      overduePlans,
      stats,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/war-room/dashboard error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
