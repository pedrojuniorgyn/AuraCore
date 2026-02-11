import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { listRequestLogs } from "@/lib/observability/request-buffer";
import { withDI } from '@/shared/infrastructure/di/with-di';

export const runtime = "nodejs";

function isInternalTokenOk(req: NextRequest) {
  // Opção 1: reutiliza token já existente (audit/migrações) se estiver configurado
  const auditToken = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerAuditToken = req.headers.get("x-audit-token");
  if (auditToken && headerAuditToken && headerAuditToken === auditToken) return true;

  // Opção 2: token dedicado para diagnóstico (recomendado se quiser separar)
  const diagToken = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerDiagToken =
    req.headers.get("x-internal-token") ||
    req.headers.get("x-diagnostics-token");
  if (diagToken && headerDiagToken && headerDiagToken === diagToken) return true;

  return false;
}

/**
 * GET /api/admin/diagnostics/requests
 * Lista requests mais lentos do buffer in-memory (útil em Coolify).
 *
 * Query params:
 * - limit (default 50)
 * - minMs (default 200)
 * - sinceMinutes (default 30)
 */
export const GET = withDI(async (req: NextRequest) => {
  const handler = async () => {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const minMs = Number(searchParams.get("minMs") ?? "200");
    const sinceMinutes = Number(searchParams.get("sinceMinutes") ?? "30");

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, limit)) : 50;
    const safeMinMs = Number.isFinite(minMs) ? Math.max(0, minMs) : 200;
    const safeSinceMinutes = Number.isFinite(sinceMinutes) ? Math.max(0, sinceMinutes) : 30;

    const items = listRequestLogs({
      limit: safeLimit,
      minDurationMs: safeMinMs,
      sinceMs: safeSinceMinutes ? safeSinceMinutes * 60_000 : undefined,
    });

    return NextResponse.json({
      success: true,
      meta: { limit: safeLimit, minMs: safeMinMs, sinceMinutes: safeSinceMinutes },
      items,
    });
  };

  // Em ambiente Coolify, é comum validar via terminal do container sem sessão NextAuth.
  // Permitimos acesso com token interno; caso contrário, exige permissão ADMIN.
  if (isInternalTokenOk(req)) return handler();
  return withPermission(req, "admin.users.manage", handler);
});

