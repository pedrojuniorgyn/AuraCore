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
   *
   * Regra baseada em ratio:
   * - Para HIGHER_IS_BETTER (UP): ratio = actual / target
   * - Para LOWER_IS_BETTER (DOWN): ratio = target / actual
   * - GREEN: ratio >= 1.0 (meta atingida ou superada)
   * - YELLOW: ratio >= warningRatio (próximo da meta)
   * - RED: ratio < warningRatio (crítico)
   *
   * @param currentValue Valor atual do KPI
   * @param target Meta/objetivo
   * @param polarity Direção ('UP' = maior melhor, 'DOWN' = menor melhor)
   * @param warningRatio Limite para status YELLOW (default 0.8 = 80%)
   */
  static calculateStatus(
    currentValue: number | null,
    target: number | null,
    polarity: 'UP' | 'DOWN',
    warningRatio: number = 0.8
  ): Result<KPIStatusValue, string> {
    // Validações de entrada
    if (currentValue === null || currentValue === undefined) {
      return Result.fail('Valor atual não disponível');
    }
    if (target === null || target === undefined || target === 0) {
      return Result.fail('Meta inválida ou não definida');
    }

    // Calcular ratio baseado na polaridade
    let ratio: number;

    if (polarity === 'UP') {
      // Maior é melhor: ratio = atual / meta
      ratio = currentValue / target;
    } else {
      // Menor é melhor: ratio = meta / atual
      // Proteger divisão por zero
      if (currentValue === 0) {
        // Se atual é zero e meta > 0, é excelente (infinitamente melhor)
        return Result.ok('GREEN');
      }
      ratio = target / currentValue;
    }

    // Determinar status baseado no ratio
    if (ratio >= 1.0) {
      return Result.ok('GREEN');
    } else if (ratio >= warningRatio) {
      return Result.ok('YELLOW');
    } else {
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
   *
   * @param currentValue Valor atual do KPI
   * @param target Meta/objetivo
   * @param polarity Direção ('UP' = maior melhor, 'DOWN' = menor melhor)
   * @param warningRatio Limite para status YELLOW (default 0.8 = 80%)
   * @param history Histórico de valores para cálculo de tendência
   */
  static analyzeKPI(
    currentValue: number | null,
    target: number | null,
    polarity: 'UP' | 'DOWN',
    warningRatio: number = 0.8,
    history: KPIHistoryPoint[] = []
  ): Result<KPIAnalysis, string> {
    // Calcular status
    const statusResult = this.calculateStatus(
      currentValue, target, polarity, warningRatio
    );
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    // Calcular variância (permite null)
    const varianceResult = this.calculateVariance(
      currentValue ?? 0,
      target ?? 0
    );
    if (Result.isFail(varianceResult)) {
      return Result.fail(varianceResult.error);
    }

    // Calcular tendência
    const trendResult = this.calculateTrend(history);
    if (Result.isFail(trendResult)) {
      return Result.fail(trendResult.error);
    }

    // Calcular progresso percentual
    const progressPercent = (target !== null && target !== 0)
      ? Math.min(100, Math.max(0, ((currentValue ?? 0) / target) * 100))
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
