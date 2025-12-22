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

function parseUtcStartOfDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
function parseUtcEndOfDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

type TenantOpts = { organizationId: number | null; isAdmin: boolean; allowedBranches: number[]; branchId: number | null };

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

    const dateFieldSafe = (q.dateField ?? "STARTED_AT") as NonNullable<typeof q.dateField>;
    const startDateSafe = q.startDate ? parseUtcStartOfDay(q.startDate) : null;
    const endDateSafe = q.endDate ? parseUtcEndOfDay(q.endDate) : null;
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
    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    const r = await audit
      .request()
      .input("run_id", (q.runId ?? null) as any)
      .input("since_days", Number.isFinite(q.sinceDays ?? 0) ? (q.sinceDays ?? 0) : 0)
      .input("start_date", (startDateSafe ?? null) as any)
      .input("end_date", (endDateSafe ?? null) as any)
      .input("severity", (q.severity ?? null) as any)
      .input("q", (q.q ?? null) as any)
      .input("org_id", (opts.organizationId ?? null) as any)
      .input("branch_id", (opts.branchId ?? null) as any)
      .input("is_admin", opts.isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT
          COUNT_BIG(1) as total_count,
          SUM(CASE WHEN f.severity = 'ERROR' THEN 1 ELSE 0 END) as errors,
          SUM(CASE WHEN f.severity = 'WARN' THEN 1 ELSE 0 END) as warns,
          SUM(CASE WHEN f.severity = 'INFO' THEN 1 ELSE 0 END) as infos,
          COUNT(DISTINCT f.rule_code) as rules
        FROM dbo.audit_findings f
        INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = f.run_id
        WHERE 1=1
          AND (@run_id IS NULL OR f.run_id = @run_id)
          AND (
            (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR ${dateCol} >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
            OR
            (@start_date IS NOT NULL OR @end_date IS NOT NULL)
          )
          AND (@start_date IS NULL OR ${dateCol} >= @start_date)
          AND (@end_date IS NULL OR ${dateCol} <= @end_date)
          AND (@severity IS NULL OR f.severity = @severity)
          AND (@q IS NULL OR f.rule_code LIKE ('%' + @q + '%') OR f.message LIKE ('%' + @q + '%') OR f.entity_type LIKE ('%' + @q + '%') OR CAST(f.entity_id as nvarchar(64)) LIKE ('%' + @q + '%'))
          AND (${
            findingsOrgColExists
              ? "(@org_id IS NULL OR f.organization_id = @org_id)"
              : orgColExists
                ? "(@org_id IS NULL OR r.organization_id = @org_id)"
                : "1=1"
          })
          AND (${
            findingsBranchColExists
              ? "(@branch_id IS NULL OR f.branch_id = @branch_id)"
              : branchColExists
                ? "(@branch_id IS NULL OR r.branch_id = @branch_id)"
                : "1=1"
          })
          AND (${
            branchColExists || findingsBranchColExists
              ? `(@is_admin = 1 OR @allowed_branch_ids = '' OR ${
                  findingsBranchColExists ? "f.branch_id" : "r.branch_id"
                } IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))`
              : "1=1"
          });
      `
      );

    const row = (r.recordset?.[0] ?? {}) as any;
    return NextResponse.json({
      success: true,
      kpis: {
        total: Number(row.total_count ?? 0),
        errors: Number(row.errors ?? 0),
        warns: Number(row.warns ?? 0),
        infos: Number(row.infos ?? 0),
        rules: Number(row.rules ?? 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha ao calcular KPIs (findings)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
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
      return NextResponse.json({ success: true, kpis: { total: 0, errors: 0, warns: 0, infos: 0, rules: 0 } });
    }
    return handle(req, {
      organizationId: ctx.organizationId,
      branchId: null,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

