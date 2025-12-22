import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const querySchema = z.object({
  sinceDays: z.coerce.number().int().min(0).max(3650).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.string().max(30).optional(),
  runId: z.string().uuid().optional(),
});

function parseUtcStartOfDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
function parseUtcEndOfDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

type TenantOpts = { organizationId: number | null; isAdmin: boolean; allowedBranches: number[]; branchId: number | null };

async function markStaleRuns(audit: Awaited<ReturnType<typeof getAuditFinPool>>) {
  const staleMinutes = Number(process.env.AUDIT_SNAPSHOT_STALE_MINUTES || "120");
  if (!Number.isFinite(staleMinutes) || staleMinutes <= 0) return;
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

async function handle(req: NextRequest, opts: TenantOpts) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Query inválida", details: parsed.error.flatten() }, { status: 400 });
    }
    const q = parsed.data;

    const sinceDaysSafe = Number.isFinite(q.sinceDays ?? 0) ? (q.sinceDays ?? 0) : 0;
    const startDateSafe = q.startDate ? parseUtcStartOfDay(q.startDate) : null;
    const endDateSafe = q.endDate ? parseUtcEndOfDay(q.endDate) : null;
    if (startDateSafe && endDateSafe && startDateSafe.getTime() > endDateSafe.getTime()) {
      return NextResponse.json({ error: "Período inválido (startDate > endDate)" }, { status: 400 });
    }

    const audit = await getAuditFinPool();
    await markStaleRuns(audit);

    const cols = await audit.request().query(`
      SELECT
        COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') as org_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') as branch_col;
    `);
    const orgColExists = (cols.recordset?.[0] as any)?.org_col != null;
    const branchColExists = (cols.recordset?.[0] as any)?.branch_col != null;

    if (opts.organizationId && orgColExists === false) {
      return NextResponse.json(
        { error: "AuditFinDB sem suporte a multi-tenancy. Rode /api/admin/audit/snapshots/migrate." },
        { status: 500 }
      );
    }

    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    const r = await audit
      .request()
      .input("since_days", sinceDaysSafe)
      .input("start_date", (startDateSafe ?? null) as any)
      .input("end_date", (endDateSafe ?? null) as any)
      .input("status", (q.status ?? null) as any)
      .input("run_id", (q.runId ?? null) as any)
      .input("org_id", (opts.organizationId ?? null) as any)
      .input("branch_id", (opts.branchId ?? null) as any)
      .input("is_admin", opts.isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT
          COUNT_BIG(1) as total,
          SUM(CASE WHEN status = 'SUCCEEDED' THEN 1 ELSE 0 END) as succeeded,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) as running,
          SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) as queued
        FROM dbo.audit_snapshot_runs
        WHERE 1=1
          AND (@run_id IS NULL OR run_id = @run_id)
          AND (@status IS NULL OR status = @status)
          AND (
            (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
            OR
            (@start_date IS NOT NULL OR @end_date IS NOT NULL)
          )
          AND (@start_date IS NULL OR started_at >= @start_date)
          AND (@end_date IS NULL OR started_at <= @end_date)
          AND (${orgColExists ? "(@org_id IS NULL OR organization_id = @org_id)" : "1=1"})
          AND (${branchColExists ? "(@branch_id IS NULL OR branch_id = @branch_id)" : "1=1"})
          AND (${
            branchColExists
              ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
              : "1=1"
          });
      `
      );

    const row = (r.recordset?.[0] ?? {}) as any;
    return NextResponse.json({
      success: true,
      kpis: {
        total: Number(row.total ?? 0),
        succeeded: Number(row.succeeded ?? 0),
        failed: Number(row.failed ?? 0),
        running: Number(row.running ?? 0),
        queued: Number(row.queued ?? 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha ao calcular KPIs (snapshots)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) {
    const url = new URL(req.url);
    const orgId = Number(url.searchParams.get("organizationId") ?? NaN);
    const branchId = Number(url.searchParams.get("branchId") ?? NaN);
    return handle(req, {
      organizationId: Number.isFinite(orgId) ? orgId : null,
      branchId: Number.isFinite(branchId) ? branchId : null,
      isAdmin: true,
      allowedBranches: [],
    });
  }

  return withPermission(req, "audit.read", async (_user, ctx) => {
    if (!ctx.isAdmin && (!ctx.allowedBranches || ctx.allowedBranches.length === 0)) {
      return NextResponse.json({ success: true, kpis: { total: 0, succeeded: 0, failed: 0, running: 0, queued: 0 } });
    }
    return handle(req, {
      organizationId: ctx.organizationId,
      branchId: null,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

