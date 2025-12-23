import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { listRequestLogs } from "@/lib/observability/request-buffer";

export const runtime = "nodejs";

/**
 * GET /api/admin/diagnostics/requests
 * Lista requests mais lentos do buffer in-memory (útil em Coolify).
 *
 * Query params:
 * - limit (default 50)
 * - minMs (default 200)
 * - sinceMinutes (default 30)
 */
export async function GET(req: NextRequest) {
  return withPermission(req, "admin.users.manage", async () => {
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
  });
}

