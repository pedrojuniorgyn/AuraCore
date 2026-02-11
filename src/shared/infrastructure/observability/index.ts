/**
 * Observability Module — Barrel Export
 *
 * Centralises exports for Prometheus-compatible metrics collection,
 * HTTP request instrumentation, and database query tracking.
 *
 * @module shared/infrastructure/observability
 * @see OBS-001 - Enhanced Health Check
 * @see OBS-002 - Prometheus Metrics
 */

// ── Prometheus Metrics Singleton ─────────────────────────────────────────────
export { PrometheusMetrics } from './PrometheusMetrics';

// ── Metrics Middleware / Helpers ──────────────────────────────────────────────
export {
  withMetricsCollection,
  trackDatabaseQuery,
  normalisePath,
} from './MetricsMiddleware';
