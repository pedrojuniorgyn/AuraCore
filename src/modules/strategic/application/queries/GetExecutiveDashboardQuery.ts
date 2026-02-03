/**
 * Use Case: GetExecutiveDashboardQuery
 * Busca dados consolidados para o Dashboard Executivo (C-level)
 * com KPIs críticos, trends e comparativos
 * 
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import { redisCache } from '@/lib/cache';

export interface GetExecutiveDashboardInput {
  strategyId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface KPIMetricDTO {
  id: string;
  code: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  trend: number; // % de mudança vs período anterior
  previousValue: number;
  perspective: string;
  responsible?: string;
  lastUpdated: Date;
}

export interface PerspectiveSummaryDTO {
  perspective: string;
  totalKpis: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  avgCompletion: number;
}

export interface ExecutiveSummaryDTO {
  totalKpis: number;
  greenPercent: number;
  yellowPercent: number;
  redPercent: number;
  avgCompletion: number;
  criticalCount: number;
  improvementCount: number; // KPIs com trend positivo
  declineCount: number; // KPIs com trend negativo
}

export interface ExecutiveDashboardOutput {
  summary: ExecutiveSummaryDTO;
  criticalKpis: KPIMetricDTO[];
  topPerformers: KPIMetricDTO[];
  perspectiveSummaries: PerspectiveSummaryDTO[];
  allKpis: KPIMetricDTO[];
  lastUpdated: Date;
}

export interface IGetExecutiveDashboardUseCase {
  execute(
    input: GetExecutiveDashboardInput,
    context: TenantContext
  ): Promise<Result<ExecutiveDashboardOutput, string>>;
}

@injectable()
export class GetExecutiveDashboardQuery implements IGetExecutiveDashboardUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository
  ) {}

  async execute(
    input: GetExecutiveDashboardInput,
    context: TenantContext
  ): Promise<Result<ExecutiveDashboardOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Verificar cache (TTL: 5 minutos)
    const cacheKey = `executive-dashboard:${context.organizationId}:${context.branchId}:${input.strategyId || 'all'}`;
    
    const cached = await redisCache.get<ExecutiveDashboardOutput>(cacheKey, 'strategic:');
    if (cached) {
      return Result.ok(cached);
    }

    // 2. Buscar todos os KPIs ativos
    const { items: kpis } = await this.kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    if (kpis.length === 0) {
      return Result.ok({
        summary: {
          totalKpis: 0,
          greenPercent: 0,
          yellowPercent: 0,
          redPercent: 0,
          avgCompletion: 0,
          criticalCount: 0,
          improvementCount: 0,
          declineCount: 0,
        },
        criticalKpis: [],
        topPerformers: [],
        perspectiveSummaries: [],
        allKpis: [],
        lastUpdated: new Date(),
      });
    }

    // 3. Calcular trend (comparação com valor anterior)
    // TODO: Buscar valores históricos do KPIHistoryRepository
    const kpiMetrics: KPIMetricDTO[] = kpis.map((kpi) => {
      const previousValue = kpi.currentValue * 0.95; // Mock: 95% do valor atual
      const trend = previousValue > 0 
        ? ((kpi.currentValue - previousValue) / previousValue) * 100 
        : 0;

      return {
        id: kpi.id,
        code: kpi.code,
        name: kpi.name,
        currentValue: kpi.currentValue,
        targetValue: kpi.targetValue,
        unit: kpi.unit,
        status: kpi.status,
        trend: Math.round(trend * 10) / 10, // 1 casa decimal
        previousValue,
        perspective: 'N/A', // TODO: Buscar perspective da Goal associada
        responsible: kpi.ownerUserId,
        lastUpdated: kpi.updatedAt,
      };
    });

    // 4. Calcular summary executivo
    const greenCount = kpis.filter((k) => k.status === 'GREEN').length;
    const yellowCount = kpis.filter((k) => k.status === 'YELLOW').length;
    const redCount = kpis.filter((k) => k.status === 'RED').length;
    const total = kpis.length;

    // Calcular completion rate médio
    const completionRates = kpis.map((kpi) => {
      if (kpi.targetValue === 0) return 0;
      const completion = (kpi.currentValue / kpi.targetValue) * 100;
      return Math.min(completion, 100);
    });
    const avgCompletion = Math.round(
      completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length
    );

    const improvementCount = kpiMetrics.filter((m) => m.trend > 0).length;
    const declineCount = kpiMetrics.filter((m) => m.trend < 0).length;

    const summary: ExecutiveSummaryDTO = {
      totalKpis: total,
      greenPercent: Math.round((greenCount / total) * 100),
      yellowPercent: Math.round((yellowCount / total) * 100),
      redPercent: Math.round((redCount / total) * 100),
      avgCompletion,
      criticalCount: redCount,
      improvementCount,
      declineCount,
    };

    // 5. KPIs críticos (RED status)
    const criticalKpis = kpiMetrics
      .filter((m) => m.status === 'RED')
      .slice(0, 5);

    // 6. Top performers (GREEN com maior % de atingimento)
    const topPerformers = kpiMetrics
      .filter((m) => m.status === 'GREEN')
      .map((m) => ({
        ...m,
        completionRate: m.targetValue > 0 ? (m.currentValue / m.targetValue) * 100 : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);

    // 7. Summary por perspectiva BSC
    // TODO: Buscar perspectives das Goals associadas aos KPIs
    const perspectives = ['Financeira', 'Clientes', 'Processos', 'Aprendizado'];
    const perspectiveSummaries: PerspectiveSummaryDTO[] = perspectives.map((perspective) => {
      // Mock: distribuir KPIs igualmente por perspectiva
      const itemsPerPerspective = Math.floor(kpis.length / perspectives.length);
      const perspectiveKpis = kpis.slice(0, itemsPerPerspective);
      const perspectiveMetrics = kpiMetrics.slice(0, itemsPerPerspective);
      
      const pGreen = perspectiveKpis.filter((k) => k.status === 'GREEN').length;
      const pYellow = perspectiveKpis.filter((k) => k.status === 'YELLOW').length;
      const pRed = perspectiveKpis.filter((k) => k.status === 'RED').length;
      const pTotal = perspectiveKpis.length;

      const pCompletionRates = perspectiveKpis.map((kpi) => {
        if (kpi.targetValue === 0) return 0;
        return Math.min((kpi.currentValue / kpi.targetValue) * 100, 100);
      });
      const pAvgCompletion = Math.round(
        pCompletionRates.reduce((sum, rate) => sum + rate, 0) / pCompletionRates.length
      );

      return {
        perspective,
        totalKpis: pTotal,
        greenCount: pGreen,
        yellowCount: pYellow,
        redCount: pRed,
        avgCompletion: pAvgCompletion,
      };
    });

    const output: ExecutiveDashboardOutput = {
      summary,
      criticalKpis,
      topPerformers,
      perspectiveSummaries,
      allKpis: kpiMetrics,
      lastUpdated: new Date(),
    };

    // Cachear resultado (5 minutos)
    await redisCache.set(cacheKey, output, { 
      ttl: 300, // 5 minutos
      prefix: 'strategic:' 
    });

    return Result.ok(output);
  }
}
