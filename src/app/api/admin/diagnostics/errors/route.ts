import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { listErrorLogs } from "@/lib/observability/request-buffer";
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
 * GET /api/admin/diagnostics/errors
 * 
 * Retorna requests com erro (status >= 400).
 *
 * Query params:
 * - sinceMinutes (default 60) - Janela de tempo em minutos
 * - limit (default 50) - Número máximo de erros
 * 
 * @example Response
 * {
 *   "success": true,
 *   "meta": { "sinceMinutes": 60, "limit": 50 },
 *   "totalErrors": 15,
 *   "errors": [
 *     {
 *       "ts": "2026-01-19T10:30:00.000Z",
 *       "requestId": "uuid",
 *       "method": "POST",
 *       "path": "/api/financial/payables",
 *       "status": 500,
 *       "durationMs": 45,
 *       "userId": "user-id",
 *       "organizationId": 1,
 *       "branchId": 1
 *     }
 *   ]
 * }
 * 
 * @see E8.5 - Observabilidade
 */
export const GET = withDI(async (req: NextRequest) => {
  const handler = async () => {
    const { searchParams } = new URL(req.url);
    const sinceMinutes = Number(searchParams.get("sinceMinutes") ?? "60");
    const limit = Number(searchParams.get("limit") ?? "50");

    const safeSinceMinutes = Number.isFinite(sinceMinutes) ? Math.max(1, Math.min(1440, sinceMinutes)) : 60;
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;

    const errors = listErrorLogs({
      sinceMs: safeSinceMinutes * 60_000,
      limit: safeLimit,
    });

    return NextResponse.json({
      success: true,
      meta: { sinceMinutes: safeSinceMinutes, limit: safeLimit },
      totalErrors: errors.length,
      errors,
    });
  };

  // Permitir acesso com token interno ou permissão admin
  if (isInternalTokenOk(req)) return handler();
  return withPermission(req, "admin.users.manage", handler);
});
