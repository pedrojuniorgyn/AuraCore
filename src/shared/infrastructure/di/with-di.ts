/**
 * withDI - Route Handler Wrapper for DI Initialization + Prometheus Metrics
 *
 * Garante que o container DI está inicializado antes de executar
 * qualquer API route handler em Next.js production.
 *
 * A partir de E17.3, coleta automaticamente métricas Prometheus
 * (http_requests_total, http_request_duration_seconds, http_request_errors_total,
 * active_connections) para todas as rotas que usam withDI — sem necessidade
 * de alterar cada rota individualmente.
 *
 * @example
 * // Em src/app/api/strategic/war-room/dashboard/route.ts
 * import { withDI } from '@/shared/infrastructure/di/with-di';
 *
 * export const GET = withDI(async (req) => {
 *   const repo = container.resolve(TOKENS.Repository);
 *   // ...
 *   return NextResponse.json(data);
 * });
 *
 * @module shared/infrastructure/di
 * @since E14.8 (metrics: E17.3)
 */
// CRÍTICO: Polyfill DEVE ser importado ANTES de qualquer módulo com decorators
import './reflect-polyfill';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDIInitializedAsync } from './ensure-initialized';
import { PrometheusMetrics } from '../observability/PrometheusMetrics';
import { normalisePath } from '../observability/MetricsMiddleware';

/**
 * Tipo para route context (dynamic segments)
 */
export interface RouteContext {
  params: Promise<Record<string, string>> | Record<string, string>;
}

/**
 * Response types - aceita Response nativo ou NextResponse
 * (handlers podem retornar Response quando propagam erros de auth)
 */
type ApiResponse = Response | NextResponse;

/**
 * Handler type for API routes without context
 */
type SimpleHandler = (req: NextRequest) => Promise<ApiResponse>;

/**
 * Handler type for API routes with context (dynamic segments)
 */
type ContextHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<ApiResponse>;

/**
 * Wrapper para rotas API que garante DI inicializado e coleta métricas.
 *
 * Uso simples (sem parâmetros dinâmicos):
 * ```typescript
 * export const GET = withDI(async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 *
 * Uso com parâmetros dinâmicos:
 * ```typescript
 * export const GET = withDI(async (req, context) => {
 *   const { id } = await context.params;
 *   return NextResponse.json({ id });
 * });
 * ```
 */
export function withDI(handler: SimpleHandler): SimpleHandler;
export function withDI(handler: ContextHandler): ContextHandler;
export function withDI(
  handler: SimpleHandler | ContextHandler
): SimpleHandler | ContextHandler {
  return async (
    req: NextRequest,
    context?: RouteContext
  ): Promise<ApiResponse> => {
    // Garantir DI inicializado ANTES de executar handler (ASYNC)
    await ensureDIInitializedAsync();

    // ── E17.3: Prometheus metrics collection (automatic) ──────────────
    const metrics = PrometheusMetrics.getInstance();
    const method = req.method;
    let metricPath: string;
    try {
      metricPath = normalisePath(new URL(req.url).pathname);
    } catch {
      metricPath = '/unknown';
    }
    const start = performance.now();
    metrics.activeConnections.inc();

    try {
      // Executar handler original
      const response = context !== undefined
        ? await (handler as ContextHandler)(req, context)
        : await (handler as SimpleHandler)(req);

      // Record success metrics
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
      // Record error metrics
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
 * Alias para melhor semântica em comandos (POST, PUT, DELETE)
 */
export const withDICommand = withDI;

/**
 * Alias para melhor semântica em queries (GET)
 */
export const withDIQuery = withDI;
