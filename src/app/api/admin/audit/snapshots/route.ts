import { NextRequest, NextResponse } from "next/server";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

async function listSnapshots(
  req: Request,
  opts?: { organizationId?: number | null; isAdmin?: boolean; allowedBranches?: number[]; branchId?: number | null }
) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";

  try {
    const audit = await getAuditFinPool();
    // Limpeza leve: runs "pendurados" (processo morreu/redeploy) não podem ficar eternamente RUNNING.
    // Snapshot típico termina em poucos minutos; por segurança usamos tolerância alta.
    const staleMinutes = Number(process.env.AUDIT_SNAPSHOT_STALE_MINUTES || "120");
    if (Number.isFinite(staleMinutes) && staleMinutes > 0) {
      await audit
        .request()
        .input("mins", staleMinutes)
        .query(
          `
          UPDATE dbo.audit_snapshot_runs
          SET status = 'FAILED',
              finished_at = SYSUTCDATETIME(),
              error_message = COALESCE(error_message, CONCAT('Stale run: excedeu ', CONVERT(varchar(20), @mins), 'min (provável recycle/redeploy).'))
          WHERE finished_at IS NULL
            AND status IN ('RUNNING','QUEUED')
            AND started_at IS NOT NULL
            AND DATEDIFF(minute, started_at, SYSUTCDATETIME()) > @mins;
        `
        );
    }
    const url = new URL(req.url);
    const sinceDaysRaw = url.searchParams.get("sinceDays");
    const sinceDays = sinceDaysRaw ? Number(sinceDaysRaw) : 0;
    const sinceDaysSafe = Number.isFinite(sinceDays) && sinceDays > 0 ? Math.floor(sinceDays) : 0;

    // Detecta se o schema suporta multi-tenancy em audit_snapshot_runs
    const hasOrgCol = await audit.request().query(`
      SELECT COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') as org_col;
    `);
    const orgColExists = (hasOrgCol.recordset?.[0] as any)?.org_col != null;

    const hasBranchCol = await audit.request().query(`
      SELECT COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') as branch_col;
    `);
    const branchColExists = (hasBranchCol.recordset?.[0] as any)?.branch_col != null;

    const orgId = opts?.organizationId ?? null;
    const explicitBranchId = opts?.branchId ?? null;
    const isAdmin = opts?.isAdmin === true;
    const allowedBranches = Array.isArray(opts?.allowedBranches) ? opts?.allowedBranches ?? [] : [];
    const branchIdsCsv = allowedBranches.length ? allowedBranches.join(",") : "";

    const q = orgColExists
      ? `
        SELECT TOP 50
          run_id,
          status,
          started_at,
          finished_at,
          period_start,
          period_end,
          error_message
        FROM dbo.audit_snapshot_runs
        WHERE 1=1
          AND (@since_days = 0 OR started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME()))
          AND (@org_id IS NULL OR organization_id = @org_id)
          ${branchColExists ? "AND (@branch_id IS NULL OR branch_id = @branch_id)" : ""}
          ${
            branchColExists
              ? "AND (@is_admin = 1 OR @allowed_branch_ids = '' OR branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
              : ""
          }
        ORDER BY started_at DESC;
      `
      : `
        SELECT TOP 50
          run_id,
          status,
          started_at,
          finished_at,
          period_start,
          period_end,
          error_message
        FROM dbo.audit_snapshot_runs
        WHERE 1=1
          AND (@since_days = 0 OR started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME()))
        ORDER BY started_at DESC;
      `;

    const r = await audit
      .request()
      .input("since_days", sinceDaysSafe)
      .input("org_id", orgId as any)
      .input("branch_id", explicitBranchId as any)
      .input("is_admin", isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(q);

    return NextResponse.json({
      success: true,
      items: (r.recordset ?? []).map((x) => {
        const row = x as unknown as Record<string, unknown>;
        const started = row.started_at ? new Date(String(row.started_at)) : null;
        const finished = row.finished_at ? new Date(String(row.finished_at)) : null;
        const pStart = row.period_start ? new Date(String(row.period_start)) : null;
        const pEnd = row.period_end ? new Date(String(row.period_end)) : null;

        return {
          runId: String(row.run_id),
          status: String(row.status),
          startedAt: started ? started.toISOString() : null,
          finishedAt: finished ? finished.toISOString() : null,
          periodStart: pStart ? pStart.toISOString().slice(0, 10) : null,
          periodEnd: pEnd ? pEnd.toISOString().slice(0, 10) : null,
          errorMessage: row.error_message ? String(row.error_message) : null,
        };
      }),
    });
  } catch (err) {
    const isProd = process.env.NODE_ENV === "production";
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao listar snapshots",
        ...(isProd && !debugRequested ? {} : { debug: { message } }),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Autorização: token (preferencial para automação) OU permissão via sessão (RBAC)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) {
    // Opcional: filtrar por tenant via querystring quando chamado por automação/admin token.
    const url = new URL(req.url);
    const orgIdRaw = url.searchParams.get("organizationId");
    const orgId = orgIdRaw ? Number(orgIdRaw) : NaN;
    const branchIdRaw = url.searchParams.get("branchId");
    const branchId = branchIdRaw ? Number(branchIdRaw) : NaN;
    return listSnapshots(req, {
      organizationId: Number.isFinite(orgId) ? orgId : null,
      branchId: Number.isFinite(branchId) ? branchId : null,
      isAdmin: true,
      allowedBranches: [],
    });
  }

  // Mesmo sem ser ADMIN, pode acessar se tiver permissão (ex.: role AUDITOR).
  return withPermission(req, "audit.read", async (_user, ctx) => {
    if (!ctx.isAdmin && (!ctx.allowedBranches || ctx.allowedBranches.length === 0)) {
      return NextResponse.json({ success: true, items: [] });
    }
    return listSnapshots(req, {
      organizationId: ctx.organizationId,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}
