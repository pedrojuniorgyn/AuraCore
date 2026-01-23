/**
 * Observability Module
 *
 * @module lib/observability
 * @since E8.1 - Performance & Observability
 * @updated E13 - Performance Optimization
 */

// Performance Tracker (E13)
export {
  performanceTracker,
  withPerformanceTracking,
} from './performance-tracker';

export type {
  PerformanceMetric as RoutePerformanceMetric,
  PerformanceStats,
  PerformanceSummary,
} from './performance-tracker';

// Metrics Collector (E8.1)
export {
  metricsCollector,
  withMetrics,
  withQueryMetrics,
  withApiMetrics,
  withIntegrationMetrics,
} from './metrics';

export type { PerformanceMetric, MetricStats, MetricType } from './metrics';

// Request Buffer
export {
  listRequestLogs,
  listErrorLogs,
  getEndpointStats,
  getTotalRequests,
} from './request-buffer';

// Logger
export { log } from './logger';
