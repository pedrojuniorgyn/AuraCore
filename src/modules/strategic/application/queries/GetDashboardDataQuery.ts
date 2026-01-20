/**
 * Use Case: GetDashboardDataQuery
 * Retorna dados consolidados do dashboard estratégico
 * 
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { KPI } from '../../domain/entities/KPI';
import type { ActionPlan } from '../../domain/entities/ActionPlan';
import type { StrategicGoal } from '../../domain/entities/StrategicGoal';

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface GetDashboardDataInput {
  includeInsight?: boolean;
}

export interface DashboardAlertDTO {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  value: string;
  kpiId?: string;
}

export interface DashboardPerspectiveDTO {
  type: 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL' | 'LEARNING';
  score: number;
  trend: number;
  kpiCount: number;
}

export interface DashboardActionDTO {
  id: string;
  code: string;
  title: string;
  daysRemaining: number;
  status: 'LATE' | 'AT_RISK' | 'ON_TIME' | 'COMPLETED';
  progress: number;
}

export interface DashboardTrendPointDTO {
  day: string;
  value: number;
}

export interface DashboardDataOutput {
  healthScore: number;
  previousHealthScore: number;
  lastUpdate: string;
  alerts: DashboardAlertDTO[];
  perspectives: DashboardPerspectiveDTO[];
  actions: DashboardActionDTO[];
  trendData: DashboardTrendPointDTO[];
  auroraInsight: string;
}

export interface IGetDashboardDataUseCase {
  execute(
    input: GetDashboardDataInput,
    context: TenantContext
  ): Promise<Result<DashboardDataOutput, string>>;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

@injectable()
export class GetDashboardDataQuery implements IGetDashboardDataUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository,
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(
    _input: GetDashboardDataInput,
    context: TenantContext
  ): Promise<Result<DashboardDataOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    const { organizationId, branchId } = context;

    try {
      // 2. Buscar KPIs (para alertas)
      const { items: kpis } = await this.kpiRepository.findMany({
        organizationId,
        branchId,
        page: 1,
        pageSize: 100,
      });

      // 3. Buscar Goals (para scores por perspectiva)
      const { items: goals } = await this.goalRepository.findMany({
        organizationId,
        branchId,
        page: 1,
        pageSize: 100,
      });

      // 4. Buscar Action Plans ativos
      const { items: actionPlans } = await this.actionPlanRepository.findMany({
        organizationId,
        branchId,
        page: 1,
        pageSize: 10,
      });

      // 5. Calcular Health Score por perspectiva (baseado em Goals)
      const perspectiveScores = this.calculatePerspectiveScores(goals, kpis);
      const healthScore = this.calculateHealthScore(perspectiveScores);

      // 6. Gerar alertas baseados em KPIs críticos
      const alerts = this.generateAlerts(kpis);

      // 7. Mapear action plans
      const actions = this.mapActionPlans(actionPlans);

      // 8. Gerar dados de tendência (últimos 5 dias)
      const trendData = this.generateTrendData(healthScore);

      // 9. Gerar insight da Aurora
      const auroraInsight = this.generateInsight(healthScore, alerts, actions);

      // 10. Formatar horário de atualização
      const lastUpdate = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return Result.ok({
        healthScore,
        previousHealthScore: Math.max(0, healthScore - 3), // TODO: Buscar do histórico
        lastUpdate,
        alerts,
        perspectives: perspectiveScores,
        actions,
        trendData,
        auroraInsight,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar dados do dashboard';
      return Result.fail(message);
    }
  }

  private calculatePerspectiveScores(
    goals: StrategicGoal[],
    kpis: KPI[]
  ): DashboardPerspectiveDTO[] {
    // Agrupar KPIs por Goal para contar
    const kpisByGoal = new Map<string, number>();
    for (const kpi of kpis) {
      if (kpi.goalId) {
        kpisByGoal.set(kpi.goalId, (kpisByGoal.get(kpi.goalId) || 0) + 1);
      }
    }

    // Mapear perspectiveId para tipo
    const perspectiveTypeMap: Record<string, DashboardPerspectiveDTO['type']> = {};
    const perspectiveData: Record<string, { scores: number[]; kpiCount: number }> = {
      FINANCIAL: { scores: [], kpiCount: 0 },
      CUSTOMER: { scores: [], kpiCount: 0 },
      INTERNAL: { scores: [], kpiCount: 0 },
      LEARNING: { scores: [], kpiCount: 0 },
    };

    // Agrupar goals por perspectiva e calcular progresso
    for (const goal of goals) {
      const perspectiveType = this.getPerspectiveType(goal.perspectiveId);
      perspectiveTypeMap[goal.perspectiveId] = perspectiveType;

      if (perspectiveData[perspectiveType]) {
        // Calcular progresso do goal
        const progress = goal.progress; // Getter que calcula currentValue/targetValue * 100
        perspectiveData[perspectiveType].scores.push(progress);
        perspectiveData[perspectiveType].kpiCount += kpisByGoal.get(goal.id) || 0;
      }
    }

    // Calcular média por perspectiva
    return Object.entries(perspectiveData).map(([type, data]) => {
      const score = data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0;

      return {
        type: type as DashboardPerspectiveDTO['type'],
        score: Math.min(100, score), // Cap at 100%
        trend: 0, // TODO: Calcular baseado em histórico
        kpiCount: data.kpiCount,
      };
    });
  }

  private getPerspectiveType(perspectiveId: string): DashboardPerspectiveDTO['type'] {
    // O perspectiveId é o UUID do bsc_perspective
    // Para simplificar, vamos mapear baseado no código (FIN, CLI, INT, LRN)
    // Em produção, isso deveria buscar da tabela bsc_perspective
    const lowerPerspective = perspectiveId.toLowerCase();
    
    if (lowerPerspective.includes('fin') || lowerPerspective.includes('financial')) {
      return 'FINANCIAL';
    }
    if (lowerPerspective.includes('cli') || lowerPerspective.includes('customer')) {
      return 'CUSTOMER';
    }
    if (lowerPerspective.includes('int') || lowerPerspective.includes('internal')) {
      return 'INTERNAL';
    }
    if (lowerPerspective.includes('lrn') || lowerPerspective.includes('learning')) {
      return 'LEARNING';
    }
    
    // Default: mapear por posição do ID (fallback)
    return 'INTERNAL';
  }

  private calculateHealthScore(perspectives: DashboardPerspectiveDTO[]): number {
    // Pesos por perspectiva BSC
    const weights: Record<string, number> = {
      FINANCIAL: 0.30,
      CUSTOMER: 0.25,
      INTERNAL: 0.25,
      LEARNING: 0.20,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const p of perspectives) {
      const weight = weights[p.type] || 0.25;
      totalScore += p.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalScore) : 0;
  }

  private generateAlerts(kpis: KPI[]): DashboardAlertDTO[] {
    const alerts: DashboardAlertDTO[] = [];

    for (const kpi of kpis) {
      const achievement = kpi.achievementPercent;
      
      // KPIs com status RED são críticos
      if (kpi.status === 'RED') {
        alerts.push({
          id: kpi.id,
          type: 'CRITICAL',
          title: `${kpi.name} abaixo da meta`,
          value: `${kpi.currentValue}${kpi.unit} (meta: ${kpi.targetValue}${kpi.unit})`,
          kpiId: kpi.id,
        });
      }
      // KPIs com status YELLOW são warning
      else if (kpi.status === 'YELLOW') {
        alerts.push({
          id: kpi.id,
          type: 'WARNING',
          title: `${kpi.name} em risco`,
          value: `${kpi.currentValue}${kpi.unit} (meta: ${kpi.targetValue}${kpi.unit})`,
          kpiId: kpi.id,
        });
      }
    }

    // Ordenar por tipo (CRITICAL primeiro) e limitar a 5
    return alerts
      .sort((a, b) => (a.type === 'CRITICAL' ? -1 : 1))
      .slice(0, 5);
  }

  private mapActionPlans(actionPlans: ActionPlan[]): DashboardActionDTO[] {
    const now = new Date();

    return actionPlans.map((plan) => {
      const dueDate = new Date(plan.whenEnd); // 5W2H: When (end date)
      const diffMs = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let status: DashboardActionDTO['status'];
      const planStatus = plan.status;
      
      if (planStatus === 'COMPLETED') {
        status = 'COMPLETED';
      } else if (daysRemaining < 0) {
        status = 'LATE';
      } else if (daysRemaining <= 5) {
        status = 'AT_RISK';
      } else {
        status = 'ON_TIME';
      }

      return {
        id: plan.id,
        code: plan.code,
        title: plan.what, // 5W2H: What
        daysRemaining,
        status,
        progress: plan.completionPercent,
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  private generateTrendData(currentScore: number): DashboardTrendPointDTO[] {
    // TODO: Buscar histórico real de health score
    // Por enquanto, simular tendência baseada no score atual
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    const baseScore = Math.max(0, currentScore - 10);

    return days.map((day, index) => ({
      day,
      value: Math.min(100, baseScore + (index * 2) + Math.floor(Math.random() * 3)),
    }));
  }

  private generateInsight(
    healthScore: number,
    alerts: DashboardAlertDTO[],
    actions: DashboardActionDTO[]
  ): string {
    const criticalAlerts = alerts.filter(a => a.type === 'CRITICAL').length;
    const lateActions = actions.filter(a => a.status === 'LATE').length;
    const atRiskActions = actions.filter(a => a.status === 'AT_RISK').length;

    if (criticalAlerts > 0) {
      return `Identificado ${criticalAlerts} KPI(s) crítico(s) que requerem atenção imediata. O Health Score está em ${healthScore}%. Recomendo priorizar as ações corretivas.`;
    }

    if (lateActions > 0) {
      return `Há ${lateActions} plano(s) de ação atrasado(s). Para melhorar o Health Score de ${healthScore}%, foque em regularizar essas pendências.`;
    }

    if (atRiskActions > 0) {
      return `${atRiskActions} plano(s) de ação estão em risco de atraso. Health Score atual: ${healthScore}%. Monitore de perto para evitar impacto nos resultados.`;
    }

    if (healthScore >= 80) {
      return `Excelente! O Health Score está em ${healthScore}%, acima da meta. Continue monitorando para manter esse desempenho.`;
    }

    return `O Health Score está em ${healthScore}%. Para atingir a meta de 80%, analise as perspectivas com menor desempenho e priorize ações de melhoria.`;
  }
}
