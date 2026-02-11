/**
 * Metrics Middleware Helper
 *
 * Provides a higher-order wrapper for Next.js App Router route handlers
 * that automatically collects HTTP request metrics (count, duration, errors)
 * into the {@link PrometheusMetrics} singleton.
 *
 * Since Next.js App Router does not support traditional Express-style
 * middleware chaining, this module exports a `withMetricsCollection` wrapper
 * that can be composed with `withDI` or used standalone.
 *
 * @module shared/infrastructure/observability/MetricsMiddleware
 * @see OBS-002 - Prometheus Metrics
 * @see PrometheusMetrics
 *
 * @example
 * ```typescript
 * import { withMetricsCollection } from '@/shared/infrastructure/observability';
 *
 * export const GET = withMetricsCollection('/api/health', async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrometheusMetrics } from './PrometheusMetrics';

/**
 * Response types accepted by wrapped handlers.
 * Handlers may return native `Response` (e.g. from auth guards) or `NextResponse`.
 */
type ApiResponse = Response | NextResponse;

/** A simple Next.js route handler signature. */
type RouteHandler = (req: NextRequest) => Promise<ApiResponse>;

/**
 * Normalises a URL pathname into a metrics-friendly path label.
 *
 * - Strips query strings and hash fragments.
 * - Replaces UUID-like segments with `:id` to avoid high-cardinality labels.
 * - Replaces pure numeric segments with `:id`.
 *
 * @example
 * ```
 * normalisePath('/api/fiscal/cte/550e8400-e29b-41d4-a716-446655440000/cancel')
 * // => '/api/fiscal/cte/:id/cancel'
 * ```
 */
export function normalisePath(rawPath: string): string {
  const path = rawPath.split('?')[0].split('#')[0];
  return path
    .split('/')
    .map((segment) => {
      // Replace UUIDs (v4 format)
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        return ':id';
      }
      // Replace purely numeric IDs
      if (/^\d+$/.test(segment) && segment.length > 0) {
        return ':id';
      }
      return segment;
    })
    .join('/');
}

/**
 * Wraps a Next.js route handler to automatically collect HTTP metrics.
 *
 * Metrics collected per request:
 * - `http_requests_total` — incremented with method, path, and status code
 * - `http_request_duration_seconds` — observed with method and path
 * - `http_request_errors_total` — incremented on 5xx status or unhandled errors
 * - `active_connections` — gauged during request lifecycle
 *
 * @param path - The route path label for metrics (e.g. `/api/health`).
 *               If omitted, the path is extracted and normalised from the request URL.
 * @param handler - The underlying route handler to wrap.
 * @returns A new handler with metrics instrumentation.
 */
export function withMetricsCollection(
  path: string,
  handler: RouteHandler,
): RouteHandler;
export function withMetricsCollection(handler: RouteHandler): RouteHandler;
export function withMetricsCollection(
  pathOrHandler: string | RouteHandler,
  maybeHandler?: RouteHandler,
): RouteHandler {
  const explicitPath = typeof pathOrHandler === 'string' ? pathOrHandler : undefined;
  const handler = typeof pathOrHandler === 'function' ? pathOrHandler : maybeHandler!;

  return async (req: NextRequest): Promise<ApiResponse> => {
    const metrics = PrometheusMetrics.getInstance();
    const method = req.method;
    const metricPath = explicitPath ?? normalisePath(new URL(req.url).pathname);
    const start = performance.now();

    metrics.activeConnections.inc();

    try {
      const response = await handler(req);
      const durationSec = (performance.now() - start) / 1_000;
      const statusCode = String(response.status);

      metrics.httpRequestsTotal.inc({ method, path: metricPath, status_code: statusCode });
      metrics.httpRequestDuration.observe({ method, path: metricPath }, durationSec);

      if (response.status >= 500) {
        metrics.httpRequestErrors.inc({
          method,
          path: metricPath,
          error_type: 'server_error',
        });
      }

      return response;
    } catch (error: unknown) {
      const durationSec = (performance.now() - start) / 1_000;

      metrics.httpRequestsTotal.inc({ method, path: metricPath, status_code: '500' });
      metrics.httpRequestDuration.observe({ method, path: metricPath }, durationSec);
      metrics.httpRequestErrors.inc({
        method,
        path: metricPath,
        error_type: error instanceof Error ? error.name : 'unknown_error',
      });

      throw error;
    } finally {
      metrics.activeConnections.dec();
    }
  };
}

/**
 * Records a database query duration in the Prometheus histogram.
 *
 * Can be used as a standalone helper around any database operation:
 *
 * @example
 * ```typescript
 * const result = await trackDatabaseQuery(async () => {
 *   return db.select().from(users).where(eq(users.id, id));
 * });
 * ```
 *
 * @param fn - The async database operation to measure.
 * @returns The result of the database operation.
 */
export async function trackDatabaseQuery<T>(fn: () => Promise<T>): Promise<T> {
  const metrics = PrometheusMetrics.getInstance();
  const start = performance.now();

  try {
    return await fn();
  } finally {
    const durationSec = (performance.now() - start) / 1_000;
    metrics.databaseQueryDuration.observe({}, durationSec);
  }
}
