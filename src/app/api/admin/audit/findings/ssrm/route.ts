import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const querySchema = z.object({
  runId: z.string().uuid().optional(),
  sinceDays: z.coerce.number().int().min(0).max(3650).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateField: z.enum(["SNAPSHOT", "STARTED_AT"]).optional(),
  severity: z.string().max(20).optional(),
  q: z.string().max(200).optional(),
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
    const take = Math.max(1, Math.min(500, takeRaw));
    const offset = startRow;

    const dateFieldSafe = (query.dateField ?? "STARTED_AT") as NonNullable<typeof query.dateField>;
    const startDateSafe = query.startDate ? parseUtcStartOfDay(query.startDate) : null;
    const endDateSafe = query.endDate ? parseUtcEndOfDay(query.endDate) : null;
    if (startDateSafe && endDateSafe && startDateSafe.getTime() > endDateSafe.getTime()) {
      return NextResponse.json({ error: "Período inválido (startDate > endDate)" }, { status: 400 });
    }
    if (startDateSafe && endDateSafe) {
      const days = (endDateSafe.getTime() - startDateSafe.getTime()) / (24 * 60 * 60 * 1000);
      if (days > 1100) return NextResponse.json({ error: "Período máximo para filtro por data é 36 meses." }, { status: 400 });
    }

    const audit = await getAuditFinPool();
    const cols = await audit.request().query(`
      SELECT
        COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') as org_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') as branch_col,
        COL_LENGTH('dbo.audit_findings', 'organization_id') as f_org_col,
        COL_LENGTH('dbo.audit_findings', 'branch_id') as f_branch_col;
    `);
    const orgColExists = (cols.recordset?.[0] as any)?.org_col != null;
    const branchColExists = (cols.recordset?.[0] as any)?.branch_col != null;
    const findingsOrgColExists = (cols.recordset?.[0] as any)?.f_org_col != null;
    const findingsBranchColExists = (cols.recordset?.[0] as any)?.f_branch_col != null;

    if (opts.organizationId && orgColExists === false && findingsOrgColExists === false) {
      return NextResponse.json(
        { error: "AuditFinDB sem suporte a multi-tenancy. Rode /api/admin/audit/snapshots/migrate." },
        { status: 500 }
      );
    }

    const dateCol = dateFieldSafe === "SNAPSHOT" ? "r.started_at" : "f.started_at";

    const request = audit.request();
    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    request.input("offset", offset);
    request.input("take", take);
    request.input("run_id", (query.runId ?? null) as any);
    request.input("since_days", Number.isFinite(query.sinceDays ?? 0) ? (query.sinceDays ?? 0) : 0);
    request.input("start_date", (startDateSafe ?? null) as any);
    request.input("end_date", (endDateSafe ?? null) as any);
    request.input("severity", (query.severity ?? null) as any);
    request.input("q", (query.q ?? null) as any);
    request.input("org_id", (opts.organizationId ?? null) as any);
    request.input("branch_id", (opts.branchId ?? null) as any);
    request.input("is_admin", opts.isAdmin ? 1 : 0);
    request.input("allowed_branch_ids", branchIdsCsv);

    const whereParts: string[] = ["1=1"];
    whereParts.push("(@run_id IS NULL OR f.run_id = @run_id)");
    whereParts.push(
      `(
        (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR ${dateCol} >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
        OR
        (@start_date IS NOT NULL OR @end_date IS NOT NULL)
      )`
    );
    whereParts.push(`(@start_date IS NULL OR ${dateCol} >= @start_date)`);
    whereParts.push(`(@end_date IS NULL OR ${dateCol} <= @end_date)`);
    whereParts.push("(@severity IS NULL OR f.severity = @severity)");
    whereParts.push(
      "(@q IS NULL OR f.rule_code LIKE ('%' + @q + '%') OR f.message LIKE ('%' + @q + '%') OR f.entity_type LIKE ('%' + @q + '%') OR CAST(f.entity_id as nvarchar(64)) LIKE ('%' + @q + '%'))"
    );

    if (findingsOrgColExists) whereParts.push("(@org_id IS NULL OR f.organization_id = @org_id)");
    else if (orgColExists) whereParts.push("(@org_id IS NULL OR r.organization_id = @org_id)");

    if (findingsBranchColExists) whereParts.push("(@branch_id IS NULL OR f.branch_id = @branch_id)");
    else if (branchColExists) whereParts.push("(@branch_id IS NULL OR r.branch_id = @branch_id)");

    if (branchColExists || findingsBranchColExists) {
      const col = findingsBranchColExists ? "f.branch_id" : "r.branch_id";
      whereParts.push(
        `(@is_admin = 1 OR @allowed_branch_ids = '' OR ${col} IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))`
      );
    }

    const colMap: Record<string, string> = {
      severity: "f.severity",
      ruleCode: "f.rule_code",
      message: "f.message",
      entityType: "f.entity_type",
      entityId: "f.entity_id",
      periodStart: "f.period_start",
      periodEnd: "f.period_end",
      startedAt: "f.started_at",
      branchId: findingsBranchColExists ? "f.branch_id" : branchColExists ? "r.branch_id" : "CAST(NULL as int)",
      runId: "f.run_id",
    };

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
        } else if ((type === "lessThan" || type === "lessThanOrEqual") && a) {
          const k = param("dlt");
          request.input(k, a);
          whereParts.push(`${col} ${type === "lessThanOrEqual" ? "<=" : "<"} @${k}`);
        } else if ((type === "greaterThan" || type === "greaterThanOrEqual") && a) {
          const k = param("dgt");
          request.input(k, a);
          whereParts.push(`${col} ${type === "greaterThanOrEqual" ? ">=" : ">"} @${k}`);
        }
        continue;
      }

      const type = String(fm?.type ?? "contains");
      const val = fm?.filter;
      if (val == null || val === "") continue;
      const k = param("t");
      request.input(k, String(val));
      if (type === "equals") whereParts.push(`${col} = @${k}`);
      else if (type === "notEqual") whereParts.push(`${col} <> @${k}`);
      else if (type === "startsWith") whereParts.push(`${col} LIKE (@${k} + '%')`);
      else if (type === "endsWith") whereParts.push(`${col} LIKE ('%' + @${k})`);
      else if (type === "notContains") whereParts.push(`${col} NOT LIKE ('%' + @${k} + '%')`);
      else whereParts.push(`${col} LIKE ('%' + @${k} + '%')`);
    }

    const orderParts: string[] = [];
    for (const s of sortModel.slice(0, 5)) {
      const col = colMap[s.colId];
      if (!col) continue;
      orderParts.push(`${col} ${s.sort.toUpperCase()}`);
    }
    if (!orderParts.length) {
      orderParts.push(`${dateCol} DESC`, "f.id DESC");
    }

    const whereSql = whereParts.join("\n  AND ");
    const orderSql = orderParts.join(", ");

    const rowsQuery = `
      SELECT
        f.id,
        f.run_id,
        f.rule_code,
        f.severity,
        f.entity_type,
        f.entity_id,
        f.message,
        f.evidence_json,
        f.started_at,
        f.period_start,
        f.period_end,
        ${findingsBranchColExists ? "f.branch_id as branch_id" : branchColExists ? "r.branch_id as branch_id" : "CAST(NULL as int) as branch_id"}
      FROM dbo.audit_findings f
      INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = f.run_id
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      OFFSET @offset ROWS FETCH NEXT @take ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT_BIG(1) as total
      FROM dbo.audit_findings f
      INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = f.run_id
      WHERE ${whereSql};
    `;

    const [rowsRes, countRes] = await Promise.all([request.query(rowsQuery), request.query(countQuery)]);
    const total = Number((countRes.recordset?.[0] as any)?.total ?? 0);
    const rows = (rowsRes.recordset ?? []).map((row: any) => {
      const started = row.started_at ? new Date(String(row.started_at)) : null;
      const a = row.period_start ? String(row.period_start).slice(0, 10) : null;
      const b = row.period_end ? String(row.period_end).slice(0, 10) : null;
      return {
        id: String(row.id),
        runId: String(row.run_id),
        ruleCode: row.rule_code ? String(row.rule_code) : "",
        severity: row.severity ? String(row.severity) : "",
        entityType: row.entity_type ? String(row.entity_type) : "",
        entityId: row.entity_id == null ? null : String(row.entity_id),
        message: row.message ? String(row.message) : "",
        evidenceJson: row.evidence_json ? String(row.evidence_json) : null,
        startedAt: started ? started.toISOString() : null,
        periodStart: a,
        periodEnd: b,
        branchId: row.branch_id == null ? null : Number(row.branch_id),
      };
    });

    return NextResponse.json({ success: true, rows, lastRow: total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha SSRM (findings)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
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

