import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { getLatestOpsHealthRun } from "@/lib/ops/ops-health-db";

export const runtime = "nodejs";

function isInternalTokenOk(req: NextRequest) {
  const auditToken = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerAuditToken = req.headers.get("x-audit-token");
  if (auditToken && headerAuditToken && headerAuditToken === auditToken) return true;

  const diagToken = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerDiagToken =
    req.headers.get("x-internal-token") || req.headers.get("x-diagnostics-token");
  if (diagToken && headerDiagToken && headerDiagToken === diagToken) return true;

  return false;
}

export async function GET(req: NextRequest) {
  const handler = async () => {
    const row = await getLatestOpsHealthRun();
    return NextResponse.json({ success: true, run: row });
  };

  if (isInternalTokenOk(req)) return handler();
  return withPermission(req, "admin.users.manage", handler);
}

