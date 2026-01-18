/**
 * Metrics Collector para AuraCore
 * 
 * Coleta métricas de performance em memória para análise.
 * Otimizado para baixo overhead em produção.
 * 
 * @module lib/observability/metrics
 * @see E8.1 - Performance & Observability
 */

import { log } from './logger';

/**
 * Tipos de métricas suportadas
 */
export type MetricType = 'query' | 'api' | 'integration' | 'cache';

/**
 * Interface para uma métrica de performance
 */
export interface PerformanceMetric {
  /** Nome identificador da operação */
  name: string;
  /** Tipo da métrica */
  type: MetricType;
  /** Duração em milissegundos */
  duration: number;
  /** Timestamp da coleta */
  timestamp: Date;
  /** Sucesso ou falha */
  success: boolean;
  /** Metadados adicionais */
  metadata?: Record<string, unknown>;
}

/**
 * Estatísticas agregadas de uma métrica
 */
export interface MetricStats {
  name: string;
  type: MetricType;
  count: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
}

/**
 * Configuração do collector
 */
interface MetricsConfig {
  /** Tamanho máximo do buffer por tipo */
  maxBufferSize: number;
  /** Threshold para slow queries (ms) */
  slowQueryThreshold: number;
  /** Threshold para slow APIs (ms) */
  slowApiThreshold: number;
  /** Habilitar logging automático de métricas lentas */
  logSlowMetrics: boolean;
}

const DEFAULT_CONFIG: MetricsConfig = {
  maxBufferSize: 1000,
  slowQueryThreshold: 500,
  slowApiThreshold: 2000,
  logSlowMetrics: true,
};

/**
 * Collector singleton para métricas de performance
 */
class MetricsCollector {
  private buffers: Map<MetricType, PerformanceMetric[]> = new Map();
  private config: MetricsConfig;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Inicializa buffers para cada tipo
    const types: MetricType[] = ['query', 'api', 'integration', 'cache'];
    types.forEach(type => this.buffers.set(type, []));
  }

  /**
   * Registra uma métrica de performance
   */
  record(metric: PerformanceMetric): void {
    const buffer = this.buffers.get(metric.type);
    if (!buffer) return;

    // Mantém tamanho do buffer
    if (buffer.length >= this.config.maxBufferSize) {
      buffer.shift();
    }
    
    buffer.push(metric);

    // Log de métricas lentas
    if (this.config.logSlowMetrics && this.isSlowMetric(metric)) {
      log('warn', `Slow ${metric.type} detected: ${metric.name}`, {
        duration: metric.duration,
        type: metric.type,
        success: metric.success,
        metadata: metric.metadata,
      });
    }
  }

  /**
   * Verifica se a métrica é considerada lenta
   */
  private isSlowMetric(metric: PerformanceMetric): boolean {
    if (metric.type === 'query') {
      return metric.duration >= this.config.slowQueryThreshold;
    }
    if (metric.type === 'api') {
      return metric.duration >= this.config.slowApiThreshold;
    }
    return false;
  }

  /**
   * Retorna métricas lentas por tipo
   */
  getSlowMetrics(type: MetricType, limit = 10): PerformanceMetric[] {
    const buffer = this.buffers.get(type) || [];
    const threshold = type === 'query' 
      ? this.config.slowQueryThreshold 
      : this.config.slowApiThreshold;

    return buffer
      .filter(m => m.duration >= threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Retorna estatísticas agregadas para uma métrica específica
   */
  getStats(name: string, type: MetricType): MetricStats | null {
    const buffer = this.buffers.get(type) || [];
    const metrics = buffer.filter(m => m.name === name);

    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;

    return {
      name,
      type,
      count: metrics.length,
      successCount,
      failureCount: metrics.length - successCount,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / metrics.length),
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(metrics.length * 0.95)] || durations[durations.length - 1],
    };
  }

  /**
   * Retorna resumo geral de todas as métricas
   */
  getSummary(): Record<MetricType, { total: number; slow: number; avgDuration: number }> {
    const summary: Record<MetricType, { total: number; slow: number; avgDuration: number }> = {
      query: { total: 0, slow: 0, avgDuration: 0 },
      api: { total: 0, slow: 0, avgDuration: 0 },
      integration: { total: 0, slow: 0, avgDuration: 0 },
      cache: { total: 0, slow: 0, avgDuration: 0 },
    };

    for (const [type, buffer] of this.buffers.entries()) {
      const total = buffer.length;
      const slow = buffer.filter(m => this.isSlowMetric(m)).length;
      const avgDuration = total > 0 
        ? Math.round(buffer.reduce((sum, m) => sum + m.duration, 0) / total) 
        : 0;

      summary[type] = { total, slow, avgDuration };
    }

    return summary;
  }

  /**
   * Retorna as N métricas mais recentes de um tipo
   */
  getRecent(type: MetricType, limit = 20): PerformanceMetric[] {
    const buffer = this.buffers.get(type) || [];
    return buffer.slice(-limit);
  }

  /**
   * Limpa todas as métricas
   */
  clear(): void {
    for (const buffer of this.buffers.values()) {
      buffer.length = 0;
    }
  }

  /**
   * Limpa métricas de um tipo específico
   */
  clearType(type: MetricType): void {
    const buffer = this.buffers.get(type);
    if (buffer) {
      buffer.length = 0;
    }
  }
}

/**
 * Instância singleton do collector
 */
export const metricsCollector = new MetricsCollector();

/**
 * Helper para medir e registrar uma operação
 * 
 * @example
 * ```typescript
 * const result = await withMetrics('createUser', 'api', async () => {
 *   return userService.create(data);
 * });
 * ```
 */
export async function withMetrics<T>(
  name: string,
  type: MetricType,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  let success = true;

  try {
    return await fn();
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Math.round(performance.now() - start);
    
    metricsCollector.record({
      name,
      type,
      duration,
      timestamp: new Date(),
      success,
      metadata,
    });
  }
}

/**
 * Helper para métricas de query
 */
export async function withQueryMetrics<T>(
  queryName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return withMetrics(queryName, 'query', fn, metadata);
}

/**
 * Helper para métricas de API
 */
export async function withApiMetrics<T>(
  endpoint: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return withMetrics(endpoint, 'api', fn, metadata);
}

/**
 * Helper para métricas de integração externa
 */
export async function withIntegrationMetrics<T>(
  integrationName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return withMetrics(integrationName, 'integration', fn, metadata);
}
