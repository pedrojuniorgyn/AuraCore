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

const ssrmBodySchema = z.object({
  startRow: z.coerce.number().int().min(0),
  endRow: z.coerce.number().int().min(1),
  sortModel: z.array(z.object({ colId: z.string().min(1), sort: z.enum(["asc", "desc"]) })).default([]),
  filterModel: z.record(z.any()).default({}),
  query: querySchema.default({}),
});

function parseUtcStartOfDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
function parseUtcEndOfDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999Z`);
}
function parseDateLike(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
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
    const parsed = ssrmBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const { startRow, endRow, sortModel, filterModel, query } = parsed.data;
    const takeRaw = endRow - startRow;
    const take = Math.max(1, Math.min(200, takeRaw)); // runs não precisam páginas enormes
    const offset = startRow;

    const sinceDaysSafe = Number.isFinite(query.sinceDays ?? 0) ? (query.sinceDays ?? 0) : 0;
    const startDateSafe = query.startDate ? parseUtcStartOfDay(query.startDate) : null;
    const endDateSafe = query.endDate ? parseUtcEndOfDay(query.endDate) : null;
    if (startDateSafe && endDateSafe && startDateSafe.getTime() > endDateSafe.getTime()) {
      return NextResponse.json({ error: "Período inválido (startDate > endDate)" }, { status: 400 });
    }

    const audit = await getAuditFinPool();
    await markStaleRuns(audit);

    const cols = await audit.request().query(`
      SELECT
        COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') as org_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') as branch_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'requested_by_user_id') as req_user_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'requested_by_email') as req_email_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'legacy_company_branch_code') as legacy_col;
    `);
    const orgColExists = (cols.recordset?.[0] as any)?.org_col != null;
    const branchColExists = (cols.recordset?.[0] as any)?.branch_col != null;
    const reqUserColExists = (cols.recordset?.[0] as any)?.req_user_col != null;
    const reqEmailColExists = (cols.recordset?.[0] as any)?.req_email_col != null;
    const legacyColExists = (cols.recordset?.[0] as any)?.legacy_col != null;

    if (opts.organizationId && orgColExists === false) {
      return NextResponse.json(
        { error: "AuditFinDB sem suporte a multi-tenancy. Rode /api/admin/audit/snapshots/migrate." },
        { status: 500 }
      );
    }

    const request = audit.request();
    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    request.input("offset", offset);
    request.input("take", take);
    request.input("since_days", sinceDaysSafe);
    request.input("start_date", (startDateSafe ?? null) as any);
    request.input("end_date", (endDateSafe ?? null) as any);
    request.input("status", (query.status ?? null) as any);
    request.input("run_id", (query.runId ?? null) as any);
    request.input("org_id", (opts.organizationId ?? null) as any);
    request.input("branch_id", (opts.branchId ?? null) as any);
    request.input("is_admin", opts.isAdmin ? 1 : 0);
    request.input("allowed_branch_ids", branchIdsCsv);

    const whereParts: string[] = ["1=1"];
    whereParts.push("(@run_id IS NULL OR run_id = @run_id)");
    whereParts.push("(@status IS NULL OR status = @status)");
    whereParts.push(
      `(
        (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
        OR
        (@start_date IS NOT NULL OR @end_date IS NOT NULL)
      )`
    );
    whereParts.push("(@start_date IS NULL OR started_at >= @start_date)");
    whereParts.push("(@end_date IS NULL OR started_at <= @end_date)");
    whereParts.push(orgColExists ? "(@org_id IS NULL OR organization_id = @org_id)" : "1=1");
    whereParts.push(branchColExists ? "(@branch_id IS NULL OR branch_id = @branch_id)" : "1=1");
    whereParts.push(
      branchColExists
        ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
        : "1=1"
    );

    const colMap: Record<string, string> = {
      runId: "run_id",
      status: "status",
      startedAt: "started_at",
      finishedAt: "finished_at",
      periodStart: "period_start",
      periodEnd: "period_end",
      branchId: branchColExists ? "branch_id" : "CAST(NULL as int)",
      organizationId: orgColExists ? "organization_id" : "CAST(NULL as int)",
      requestedByEmail: reqEmailColExists ? "requested_by_email" : "CAST(NULL as nvarchar(255))",
      requestedByUserId: reqUserColExists ? "requested_by_user_id" : "CAST(NULL as nvarchar(255))",
      legacyCompanyBranchCode: legacyColExists ? "legacy_company_branch_code" : "CAST(NULL as int)",
      errorMessage: "error_message",
    };

    // filtros vindos do grid
    let p = 0;
    for (const [field, fm] of Object.entries(filterModel ?? {})) {
      const col = colMap[field];
      if (!col) continue;
      const param = (suffix: string) => `${field}_${suffix}_${p++}`;

      if (fm?.filterType === "set" && Array.isArray(fm?.values) && fm.values.length) {
        const csv = fm.values.map((v: any) => String(v)).join(",");
        const k = param("set");
        request.input(k, csv);
        whereParts.push(`${col} IN (SELECT value FROM string_split(@${k}, ','))`);
        continue;
      }

      if (fm?.filterType === "date") {
        const type = String(fm?.type ?? "");
        const a = parseDateLike(fm?.dateFrom ?? fm?.filter);
        const b = parseDateLike(fm?.dateTo ?? fm?.filterTo);
        if (type === "inRange" && a && b) {
          const k1 = param("d1");
          const k2 = param("d2");
          request.input(k1, a);
          request.input(k2, b);
          whereParts.push(`(${col} >= @${k1} AND ${col} <= @${k2})`);
        } else if (type === "equals" && a) {
          const k1 = param("deq1");
          const k2 = param("deq2");
          request.input(k1, new Date(a.toISOString().slice(0, 10) + "T00:00:00.000Z"));
          request.input(k2, new Date(a.toISOString().slice(0, 10) + "T23:59:59.999Z"));
          whereParts.push(`(${col} >= @${k1} AND ${col} <= @${k2})`);
        }
        continue;
      }

      const type = String(fm?.type ?? "contains");
      const val = fm?.filter;
      if (val == null || val === "") continue;
      const k = param("t");
      request.input(k, String(val));
      if (type === "equals") whereParts.push(`${col} = @${k}`);
      else if (type === "startsWith") whereParts.push(`${col} LIKE (@${k} + '%')`);
      else if (type === "endsWith") whereParts.push(`${col} LIKE ('%' + @${k})`);
      else whereParts.push(`${col} LIKE ('%' + @${k} + '%')`);
    }

    const orderParts: string[] = [];
    for (const s of sortModel.slice(0, 5)) {
      const col = colMap[s.colId];
      if (!col) continue;
      orderParts.push(`${col} ${s.sort.toUpperCase()}`);
    }
    if (!orderParts.length) orderParts.push("started_at DESC");

    const whereSql = whereParts.join("\n  AND ");
    const orderSql = orderParts.join(", ");

    const rowsQuery = `
      SELECT
        run_id,
        status,
        started_at,
        finished_at,
        period_start,
        period_end,
        error_message,
        ${orgColExists ? "organization_id as organization_id," : "CAST(NULL as int) as organization_id,"}
        ${branchColExists ? "branch_id as branch_id," : "CAST(NULL as int) as branch_id,"}
        ${legacyColExists ? "legacy_company_branch_code as legacy_company_branch_code," : "CAST(NULL as int) as legacy_company_branch_code,"}
        ${reqUserColExists ? "requested_by_user_id as requested_by_user_id," : "CAST(NULL as nvarchar(255)) as requested_by_user_id,"}
        ${reqEmailColExists ? "requested_by_email as requested_by_email" : "CAST(NULL as nvarchar(255)) as requested_by_email"}
      FROM dbo.audit_snapshot_runs
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      OFFSET @offset ROWS FETCH NEXT @take ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT_BIG(1) as total
      FROM dbo.audit_snapshot_runs
      WHERE ${whereSql};
    `;

    const [rowsRes, countRes] = await Promise.all([request.query(rowsQuery), request.query(countQuery)]);
    const total = Number((countRes.recordset?.[0] as any)?.total ?? 0);
    const rows = (rowsRes.recordset ?? []).map((row: any) => {
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
        organizationId: row.organization_id == null ? null : Number(row.organization_id),
        branchId: row.branch_id == null ? null : Number(row.branch_id),
        legacyCompanyBranchCode: row.legacy_company_branch_code == null ? null : Number(row.legacy_company_branch_code),
        requestedByUserId: row.requested_by_user_id ? String(row.requested_by_user_id) : null,
        requestedByEmail: row.requested_by_email ? String(row.requested_by_email) : null,
      };
    });

    return NextResponse.json({ success: true, rows, lastRow: total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha SSRM (snapshots)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ success: true, rows: [], lastRow: 0 });
    }
    return handle(req, {
      organizationId: ctx.organizationId,
      branchId: null,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

