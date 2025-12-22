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
  dateField: z.enum(["SNAPSHOT", "DATA"]).optional(),
  statusCaixa: z.string().max(50).optional(),
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

    const dateFieldSafe = (q.dateField ?? "DATA") as NonNullable<typeof q.dateField>;
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

    const dateCol = dateFieldSafe === "SNAPSHOT" ? "r.started_at" : "d.data";
    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    const r = await audit
      .request()
      .input("run_id", (q.runId ?? null) as any)
      .input("since_days", Number.isFinite(q.sinceDays ?? 0) ? (q.sinceDays ?? 0) : 0)
      .input("start_date", (startDateSafe ?? null) as any)
      .input("end_date", (endDateSafe ?? null) as any)
      .input("status_caixa", (q.statusCaixa ?? null) as any)
      .input("org_id", (opts.organizationId ?? null) as any)
      .input("branch_id", (opts.branchId ?? null) as any)
      .input("is_admin", opts.isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT
          COUNT_BIG(1) as total_count,
          CAST(SUM(CAST(ISNULL(d.entradas,0) AS DECIMAL(18,2))) AS DECIMAL(18,2)) as entradas,
          CAST(SUM(CAST(ISNULL(d.saidas,0) AS DECIMAL(18,2))) AS DECIMAL(18,2)) as saidas,
          CAST(SUM(CAST(ISNULL(d.liquido,0) AS DECIMAL(18,2))) AS DECIMAL(18,2)) as liquido,
          CAST(SUM(CAST(ISNULL(d.saldo_final,0) AS DECIMAL(18,2))) AS DECIMAL(18,2)) as saldo_final
        FROM dbo.audit_fact_cashflow_daily d
        INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = d.run_id
        WHERE 1=1
          AND (@run_id IS NULL OR d.run_id = @run_id)
          AND (
            (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR r.started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
            OR
            (@start_date IS NOT NULL OR @end_date IS NOT NULL)
          )
          AND (@start_date IS NULL OR ${dateCol} >= @start_date)
          AND (@end_date IS NULL OR ${dateCol} <= @end_date)
          AND (@status_caixa IS NULL OR d.status_caixa = @status_caixa)
          AND (${orgColExists ? "(@org_id IS NULL OR r.organization_id = @org_id)" : "1=1"})
          AND (${branchColExists ? "(@branch_id IS NULL OR r.branch_id = @branch_id)" : "1=1"})
          AND (${
            branchColExists
              ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR r.branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
              : "1=1"
          });
      `
      );

    const row = (r.recordset?.[0] ?? {}) as any;
    return NextResponse.json({
      success: true,
      kpis: {
        count: Number(row.total_count ?? 0),
        entradas: Number(row.entradas ?? 0),
        saidas: Number(row.saidas ?? 0),
        liquido: Number(row.liquido ?? 0),
        saldoFinal: Number(row.saldo_final ?? 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha ao calcular KPIs (cashflow)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
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
      return NextResponse.json({
        success: true,
        kpis: { count: 0, entradas: 0, saidas: 0, liquido: 0, saldoFinal: 0 },
      });
    }
    return handle(req, {
      organizationId: ctx.organizationId,
      branchId: null,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

