/**
 * Observability - Central exports
 * 
 * Módulos de observabilidade para AuraCore:
 * - Logger: Logs estruturados em JSON
 * - Metrics: Métricas de performance
 * - Query Logger: Logs de queries SQL
 * - Request ID: Correlação de requests
 * - Request Buffer: Buffer de requests com p50/p95/p99
 * 
 * @module lib/observability
 * @see E8.1 - Performance & Observability
 * @see E8.5 - Observabilidade p95/p99
 */

// Logger estruturado
export { log, type LogLevel } from './logger';

// Metrics collector
export {
  metricsCollector,
  withMetrics,
  withQueryMetrics,
  withApiMetrics,
  withIntegrationMetrics,
  type PerformanceMetric,
  type MetricStats,
  type MetricType,
} from './metrics';

// Query logger para Drizzle
export {
  queryLogger,
  queryMetricsBuffer,
  measureQuery,
  MeasureQuery,
  type QueryMetric,
} from './query-logger';

// Request ID para correlação
export { getOrCreateRequestId } from './request-id';

// Request buffer com estatísticas por endpoint
export {
  pushRequestLog,
  listRequestLogs,
  listErrorLogs,
  getEndpointStats,
  getTotalRequests,
  cleanupOldRequests,
  type RequestLogItem,
  type EndpointStats,
  type DiagnosticsResponse,
} from './request-buffer';
