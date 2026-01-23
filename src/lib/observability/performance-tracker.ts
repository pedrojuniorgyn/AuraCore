/**
 * E13 - Performance Tracker
 *
 * Rastreia métricas p50/p95/p99 de rotas API
 * Armazena em buffer in-memory (ring buffer)
 *
 * @module lib/observability/performance-tracker
 * @since E13 - Performance Optimization
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetric {
  route: string;
  method: string;
  durationMs: number;
  timestamp: Date;
  statusCode: number;
  userId?: string;
  organizationId?: number;
  branchId?: number;
}

export interface PerformanceStats {
  route: string;
  method?: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  sinceMinutes: number;
  errorRate: number;
}

export interface PerformanceSummary {
  totalRoutes: number;
  totalRequests: number;
  avgDurationMs: number;
  worstP95: number;
  worstRoute: string;
  errorRate: number;
}

// ============================================================================
// PERFORMANCE TRACKER
// ============================================================================

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 10000; // Ring buffer - últimas 10k requests

  private constructor() {
    // Cleanup a cada 5 minutos (remove métricas > 24h)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Registra uma métrica de performance
   */
  track(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Ring buffer: remove oldest if limit exceeded
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Obtém estatísticas de uma rota específica ou de todas
   */
  getStats(route?: string, sinceMinutes: number = 60): PerformanceStats | null {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

    let filtered = this.metrics.filter((m) => m.timestamp >= since);

    if (route) {
      filtered = filtered.filter((m) => m.route === route);
    }

    if (filtered.length === 0) return null;

    const durations = filtered.map((m) => m.durationMs).sort((a, b) => a - b);
    const errors = filtered.filter((m) => m.statusCode >= 400).length;

    return {
      route: route || 'ALL',
      count: filtered.length,
      min: durations[0],
      max: durations[durations.length - 1],
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
      sinceMinutes,
      errorRate: Math.round((errors / filtered.length) * 100 * 100) / 100, // 2 decimais
    };
  }

  /**
   * Obtém estatísticas de todas as rotas (ordenadas por p95)
   */
  getAllRouteStats(sinceMinutes: number = 60): PerformanceStats[] {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const filtered = this.metrics.filter((m) => m.timestamp >= since);

    // Agrupar por rota
    const routeMap = new Map<string, PerformanceMetric[]>();
    for (const metric of filtered) {
      const existing = routeMap.get(metric.route) || [];
      existing.push(metric);
      routeMap.set(metric.route, existing);
    }

    // Calcular stats por rota
    const stats: PerformanceStats[] = [];
    for (const [route, metrics] of routeMap) {
      const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
      const errors = metrics.filter((m) => m.statusCode >= 400).length;

      stats.push({
        route,
        count: metrics.length,
        min: durations[0],
        max: durations[durations.length - 1],
        avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        p50: this.percentile(durations, 0.5),
        p95: this.percentile(durations, 0.95),
        p99: this.percentile(durations, 0.99),
        sinceMinutes,
        errorRate: Math.round((errors / metrics.length) * 100 * 100) / 100,
      });
    }

    // Ordenar por p95 (piores primeiro)
    return stats.sort((a, b) => b.p95 - a.p95);
  }

  /**
   * Obtém resumo geral de performance
   */
  getSummary(sinceMinutes: number = 60): PerformanceSummary {
    const allStats = this.getAllRouteStats(sinceMinutes);

    if (allStats.length === 0) {
      return {
        totalRoutes: 0,
        totalRequests: 0,
        avgDurationMs: 0,
        worstP95: 0,
        worstRoute: 'N/A',
        errorRate: 0,
      };
    }

    const totalRequests = allStats.reduce((sum, s) => sum + s.count, 0);
    const avgDuration = Math.round(
      allStats.reduce((sum, s) => sum + s.avg * s.count, 0) / totalRequests
    );
    const totalErrors = allStats.reduce(
      (sum, s) => sum + (s.errorRate / 100) * s.count,
      0
    );

    return {
      totalRoutes: allStats.length,
      totalRequests,
      avgDurationMs: avgDuration,
      worstP95: allStats[0]?.p95 || 0,
      worstRoute: allStats[0]?.route || 'N/A',
      errorRate: Math.round((totalErrors / totalRequests) * 100 * 100) / 100,
    };
  }

  /**
   * Obtém top N rotas mais lentas
   */
  getTopSlowest(n: number = 10, sinceMinutes: number = 60): PerformanceStats[] {
    return this.getAllRouteStats(sinceMinutes).slice(0, n);
  }

  /**
   * Calcula percentil de um array ordenado
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Remove métricas antigas (> 24h)
   */
  private cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  /**
   * Limpa todas as métricas (para testes)
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Obtém estatísticas do tracker
   */
  getTrackerStats(): { size: number; maxSize: number; oldestEntry: Date | null } {
    return {
      size: this.metrics.length,
      maxSize: this.MAX_METRICS,
      oldestEntry: this.metrics[0]?.timestamp || null,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const performanceTracker = PerformanceTracker.getInstance();

/**
 * Helper para medir duração de uma operação
 */
export async function withPerformanceTracking<T>(
  route: string,
  method: string,
  operation: () => Promise<T>,
  context?: {
    userId?: string;
    organizationId?: number;
    branchId?: number;
  }
): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const durationMs = Date.now() - startTime;

    performanceTracker.track({
      route,
      method,
      durationMs,
      timestamp: new Date(),
      statusCode: 200,
      ...context,
    });

    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    performanceTracker.track({
      route,
      method,
      durationMs,
      timestamp: new Date(),
      statusCode: 500,
      ...context,
    });

    throw error;
  }
}
