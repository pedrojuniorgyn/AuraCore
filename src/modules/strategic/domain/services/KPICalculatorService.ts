/**
 * Domain Service: KPICalculatorService
 * Cálculos de KPI (100% stateless)
 * 
 * @module strategic/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 */
import { Result } from '@/shared/domain';

export type KPIStatusValue = 'GREEN' | 'YELLOW' | 'RED';
export type Trend = 'UP' | 'DOWN' | 'STABLE';

interface KPIHistoryPoint {
  periodDate: Date;
  value: number;
  target: number;
}

interface VarianceResult {
  absolute: number;
  percent: number;
}

interface KPIAnalysis {
  status: KPIStatusValue;
  variance: VarianceResult;
  trend: Trend;
  progressPercent: number;
}

export class KPICalculatorService {
  private constructor() {} // Impede instanciação (DOMAIN-SVC-002)

  /**
   * Calcula status do KPI baseado em valor atual e meta
   */
  static calculateStatus(
    currentValue: number,
    target: number,
    polarity: 'UP' | 'DOWN',
    alertThreshold: number,
    criticalThreshold: number
  ): Result<KPIStatusValue, string> {
    if (target === 0) {
      return Result.fail('Meta não pode ser zero');
    }

    const variance = ((currentValue - target) / target) * 100;

    if (polarity === 'UP') {
      // Maior é melhor
      if (variance >= 0) return Result.ok('GREEN');
      if (Math.abs(variance) <= alertThreshold) return Result.ok('YELLOW');
      return Result.ok('RED');
    } else {
      // Menor é melhor
      if (variance <= 0) return Result.ok('GREEN');
      if (variance <= alertThreshold) return Result.ok('YELLOW');
      return Result.ok('RED');
    }
  }

  /**
   * Calcula tendência baseada em histórico
   */
  static calculateTrend(
    history: KPIHistoryPoint[],
    periods: number = 3
  ): Result<Trend, string> {
    if (history.length < 2) {
      return Result.ok('STABLE');
    }

    // Pegar últimos N períodos
    const recent = history
      .sort((a, b) => b.periodDate.getTime() - a.periodDate.getTime())
      .slice(0, periods);

    if (recent.length < 2) {
      return Result.ok('STABLE');
    }

    // Calcular tendência simples (primeiro vs último)
    const newest = recent[0].value;
    const oldest = recent[recent.length - 1].value;
    const change = newest - oldest;
    const threshold = Math.abs(oldest) * 0.05; // 5% de variação

    if (Math.abs(change) <= threshold) {
      return Result.ok('STABLE');
    }

    return Result.ok(change > 0 ? 'UP' : 'DOWN');
  }

  /**
   * Calcula variância (absoluta e percentual)
   */
  static calculateVariance(
    currentValue: number,
    target: number
  ): Result<VarianceResult, string> {
    const absolute = currentValue - target;
    const percent = target !== 0 ? (absolute / target) * 100 : 0;

    return Result.ok({
      absolute: Math.round(absolute * 100) / 100,
      percent: Math.round(percent * 100) / 100,
    });
  }

  /**
   * Prevê valor futuro (extrapolação linear simples)
   */
  static predictValue(
    history: KPIHistoryPoint[],
    periodsAhead: number = 1
  ): Result<number, string> {
    if (history.length < 2) {
      return Result.fail('Histórico insuficiente para previsão');
    }

    const sorted = history.sort(
      (a, b) => a.periodDate.getTime() - b.periodDate.getTime()
    );

    // Regressão linear simples
    const n = sorted.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += sorted[i].value;
      sumXY += i * sorted[i].value;
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return Result.fail('Impossível calcular regressão');
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const prediction = intercept + slope * (n - 1 + periodsAhead);

    return Result.ok(Math.round(prediction * 100) / 100);
  }

  /**
   * Análise completa de KPI
   */
  static analyzeKPI(
    currentValue: number,
    target: number,
    polarity: 'UP' | 'DOWN',
    alertThreshold: number,
    criticalThreshold: number,
    history: KPIHistoryPoint[] = []
  ): Result<KPIAnalysis, string> {
    // Calcular status
    const statusResult = this.calculateStatus(
      currentValue, target, polarity, alertThreshold, criticalThreshold
    );
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    // Calcular variância
    const varianceResult = this.calculateVariance(currentValue, target);
    if (Result.isFail(varianceResult)) {
      return Result.fail(varianceResult.error);
    }

    // Calcular tendência
    const trendResult = this.calculateTrend(history);
    if (Result.isFail(trendResult)) {
      return Result.fail(trendResult.error);
    }

    // Calcular progresso percentual
    const progressPercent = target !== 0 
      ? Math.min(100, Math.max(0, (currentValue / target) * 100))
      : 0;

    return Result.ok({
      status: statusResult.value,
      variance: varianceResult.value,
      trend: trendResult.value,
      progressPercent: Math.round(progressPercent * 100) / 100,
    });
  }

  /**
   * Determina cor baseada no status
   */
  static getStatusColor(status: KPIStatusValue): string {
    const colors: Record<KPIStatusValue, string> = {
      GREEN: '#22c55e',
      YELLOW: '#f59e0b',
      RED: '#ef4444',
    };
    return colors[status];
  }

  /**
   * Determina ícone de tendência
   */
  static getTrendIcon(trend: Trend): string {
    const icons: Record<Trend, string> = {
      UP: '↑',
      DOWN: '↓',
      STABLE: '→',
    };
    return icons[trend];
  }
}
