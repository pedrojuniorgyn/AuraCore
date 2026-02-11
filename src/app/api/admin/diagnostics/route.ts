import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import {
  listRequestLogs,
  listErrorLogs,
  getEndpointStats,
  getTotalRequests,
} from "@/lib/observability/request-buffer";
import { metricsCollector } from "@/lib/observability/metrics";
import { withDI } from '@/shared/infrastructure/di/with-di';

export const runtime = "nodejs";

function isInternalTokenOk(req: NextRequest) {
  const auditToken = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerAuditToken = req.headers.get("x-audit-token");
  if (auditToken && headerAuditToken && headerAuditToken === auditToken) return true;

  const diagToken = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerDiagToken =
    req.headers.get("x-internal-token") ||
    req.headers.get("x-diagnostics-token");
  if (diagToken && headerDiagToken && headerDiagToken === diagToken) return true;

  return false;
}

/**
 * GET /api/admin/diagnostics
 * 
 * Retorna diagnóstico completo do sistema:
 * - Uptime
 * - Total de requests no buffer
 * - Requests lentas (top N)
 * - Estatísticas por endpoint (p50/p95/p99)
 * - Erros recentes
 * - Métricas agregadas (queries, APIs, integrações)
 *
 * Query params:
 * - minMs (default 200) - Threshold para requests lentas
 * - sinceMinutes (default 60) - Janela de tempo em minutos
 * - limit (default 20) - Limite de items por categoria
 * 
 * @example Response
 * {
 *   "success": true,
 *   "timestamp": "2026-01-19T10:30:00.000Z",
 *   "uptime": 86400,
 *   "totalRequestsInBuffer": 4500,
 *   "slowRequests": [...],
 *   "endpointStats": [...],
 *   "errors": [...],
 *   "metricsSummary": {
 *     "query": { "total": 1000, "slow": 5, "avgDuration": 45 },
 *     "api": { "total": 500, "slow": 2, "avgDuration": 120 }
 *   }
 * }
 * 
 * @see E8.5 - Observabilidade
 */
export const GET = withDI(async (req: NextRequest) => {
  const handler = async () => {
    const { searchParams } = new URL(req.url);
    const minMs = Number(searchParams.get("minMs") ?? "200");
    const sinceMinutes = Number(searchParams.get("sinceMinutes") ?? "60");
    const limit = Number(searchParams.get("limit") ?? "20");

    const safeMinMs = Number.isFinite(minMs) ? Math.max(0, minMs) : 200;
    const safeSinceMinutes = Number.isFinite(sinceMinutes) ? Math.max(1, Math.min(1440, sinceMinutes)) : 60;
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 20;

    const sinceMs = safeSinceMinutes * 60_000;

    // Buscar dados
    const slowRequests = listRequestLogs({
      sinceMs,
      minDurationMs: safeMinMs,
      limit: safeLimit,
    });

    const endpointStats = getEndpointStats({
      sinceMs,
      limit: safeLimit,
    });

    const errors = listErrorLogs({
      sinceMs,
      limit: safeLimit,
    });

    const metricsSummary = metricsCollector.getSummary();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      totalRequestsInBuffer: getTotalRequests(),
      meta: {
        minMs: safeMinMs,
        sinceMinutes: safeSinceMinutes,
        limit: safeLimit,
      },
      slowRequests,
      endpointStats,
      errors,
      metricsSummary,
    });
  };

  // Permitir acesso com token interno ou permissão admin
  if (isInternalTokenOk(req)) return handler();
  return withPermission(req, "admin.users.manage", handler);
});
