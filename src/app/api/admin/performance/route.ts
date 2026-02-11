/**
 * E13 - Performance Metrics API
 *
 * Endpoint para visualizar métricas de performance p50/p95/p99 por rota.
 * Complementa o /api/admin/diagnostics com foco em rotas API.
 *
 * @module api/admin/performance
 * @since E13 - Performance Optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceTracker } from '@/lib/observability/performance-tracker';
import { metricsCollector } from '@/lib/observability/metrics';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const runtime = 'nodejs';

/**
 * Valida token interno para acesso sem autenticação (cron, health checks)
 */
function isInternalTokenOk(req: NextRequest): boolean {
  const token = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerToken =
    req.headers.get('x-internal-token') ||
    req.headers.get('x-diagnostics-token');

  if (token && headerToken && headerToken === token) return true;
  return false;
}

/**
 * GET /api/admin/performance
 *
 * Retorna métricas de performance por rota API.
 *
 * Query params:
 * - route: Filtrar por rota específica (opcional)
 * - sinceMinutes: Janela de tempo em minutos (default: 60)
 * - limit: Limite de rotas no top (default: 20)
 *
 * @example Response
 * {
 *   "success": true,
 *   "timestamp": "2026-01-23T10:30:00.000Z",
 *   "summary": {
 *     "totalRoutes": 45,
 *     "totalRequests": 1250,
 *     "avgDurationMs": 180,
 *     "worstP95": 3200,
 *     "worstRoute": "/api/financial/reports/dre",
 *     "errorRate": 1.5
 *   },
 *   "topSlowest": [...],
 *   "metricsCollectorSummary": {...}
 * }
 */
export const GET = withDI(async (req: NextRequest) => {
  // Verificar autenticação (token interno ou sessão)
  // Por enquanto aceita token interno para facilitar integração
  if (!isInternalTokenOk(req)) {
    // TODO: Implementar verificação de sessão admin
    // Por segurança, retornar 401 se não tiver token
    // Em produção, integrar com withPermission
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - requires admin access or internal token' },
        { status: 401 }
      );
    }
  }

  try {
    const { searchParams } = new URL(req.url);
    const route = searchParams.get('route') || undefined;
    const sinceMinutes = parseInt(searchParams.get('sinceMinutes') || '60', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    if (route) {
      // Stats de uma rota específica
      const stats = performanceTracker.getStats(route, sinceMinutes);

      if (!stats) {
        return NextResponse.json(
          { error: 'No data for this route', route },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        route,
        sinceMinutes,
        stats,
      });
    }

    // Stats gerais
    const summary = performanceTracker.getSummary(sinceMinutes);
    const topSlowest = performanceTracker.getTopSlowest(limit, sinceMinutes);
    const trackerStats = performanceTracker.getTrackerStats();
    const metricsCollectorSummary = metricsCollector.getSummary();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sinceMinutes,
      summary,
      topSlowest,
      trackerStats,
      metricsCollectorSummary,
    });
  } catch (error) {
    logger.error('[E13] Performance metrics error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/performance
 *
 * Registra uma métrica de performance manualmente.
 * Útil para testes e integração com sistemas externos.
 */
export const POST = withDI(async (req: NextRequest) => {
  if (!isInternalTokenOk(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - requires internal token' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const { route, method, durationMs, statusCode, userId, organizationId, branchId } =
      body;

    if (!route || !method || durationMs === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: route, method, durationMs' },
        { status: 400 }
      );
    }

    performanceTracker.track({
      route,
      method,
      durationMs,
      timestamp: new Date(),
      statusCode: statusCode || 200,
      userId,
      organizationId,
      branchId,
    });

    return NextResponse.json({
      success: true,
      message: 'Metric recorded',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/performance
 *
 * Limpa todas as métricas (para testes).
 */
export const DELETE = withDI(async (req: NextRequest) => {
  if (!isInternalTokenOk(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - requires internal token' },
      { status: 401 }
    );
  }

  performanceTracker.clear();

  return NextResponse.json({
    success: true,
    message: 'All metrics cleared',
  });
});
