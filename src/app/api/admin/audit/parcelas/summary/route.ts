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
  dateField: z.enum(["SNAPSHOT", "VENCIMENTO", "PAGAMENTO", "BANCO", "DOCUMENTO"]).optional(),
  status: z.string().max(50).optional(),
  operacao: z.enum(["PAGAMENTO", "RECEBIMENTO"]).optional(),
  onlyOpen: z.coerce.boolean().optional(),
  onlyOverdue: z.coerce.boolean().optional(),
  onlyNoBankLink: z.coerce.boolean().optional(),
  onlyPendingConciliation: z.coerce.boolean().optional(),
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

    const dateFieldSafe = (q.dateField ?? "SNAPSHOT") as NonNullable<typeof q.dateField>;
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

    const dateCol =
      dateFieldSafe === "VENCIMENTO"
        ? "f.data_vencimento"
        : dateFieldSafe === "PAGAMENTO"
          ? "f.data_pagamento_real"
          : dateFieldSafe === "BANCO"
            ? "f.data_lancamento_banco"
            : dateFieldSafe === "DOCUMENTO"
              ? "f.data_documento"
              : "r.started_at";

    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    const r = await audit
      .request()
      .input("run_id", (q.runId ?? null) as any)
      .input("since_days", Number.isFinite(q.sinceDays ?? 0) ? (q.sinceDays ?? 0) : 0)
      .input("start_date", (startDateSafe ?? null) as any)
      .input("end_date", (endDateSafe ?? null) as any)
      .input("status", (q.status ?? null) as any)
      .input("operacao", (q.operacao ?? null) as any)
      .input("only_open", q.onlyOpen ? 1 : 0)
      .input("only_overdue", q.onlyOverdue ? 1 : 0)
      .input("only_no_bank_link", q.onlyNoBankLink ? 1 : 0)
      .input("only_pending_conc", q.onlyPendingConciliation ? 1 : 0)
      .input("org_id", (opts.organizationId ?? null) as any)
      .input("branch_id", (opts.branchId ?? null) as any)
      .input("is_admin", opts.isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT
          COUNT_BIG(1) as total_count,
          CAST(SUM(CAST(ISNULL(f.valor_parcela,0) AS DECIMAL(18,2))) AS DECIMAL(18,2)) as total_valor,
          CAST(SUM(CAST(ISNULL(f.valor_pago,0) AS DECIMAL(18,2))) AS DECIMAL(18,2)) as total_pago,
          SUM(CASE WHEN f.status = 'VENCIDA' THEN 1 ELSE 0 END) as vencidas,
          SUM(CASE WHEN f.has_vinculo_bancario = 0 THEN 1 ELSE 0 END) as sem_vinculo,
          SUM(CASE WHEN f.status = 'PENDENTE_CONCILIACAO' THEN 1 ELSE 0 END) as pendente_conc
        FROM dbo.audit_fact_parcelas f
        INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = f.run_id
        WHERE 1=1
          AND (@run_id IS NULL OR f.run_id = @run_id)
          AND (
            (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR r.started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
            OR
            (@start_date IS NOT NULL OR @end_date IS NOT NULL)
          )
          AND (@start_date IS NULL OR ${dateCol} >= @start_date)
          AND (@end_date IS NULL OR ${dateCol} <= @end_date)
          AND (@status IS NULL OR f.status = @status)
          AND (@operacao IS NULL OR f.operacao = @operacao)
          AND (@only_open = 0 OR f.status IN ('ABERTA','VENCIDA','SEM_VINCULO_BANCARIO','PENDENTE_CONCILIACAO'))
          AND (@only_overdue = 0 OR (f.data_vencimento IS NOT NULL AND f.data_vencimento < SYSUTCDATETIME() AND f.status IN ('ABERTA','VENCIDA','SEM_VINCULO_BANCARIO','PENDENTE_CONCILIACAO')))
          AND (@only_no_bank_link = 0 OR f.has_vinculo_bancario = 0)
          AND (@only_pending_conc = 0 OR f.status = 'PENDENTE_CONCILIACAO')
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
        total: Number(row.total_valor ?? 0),
        paid: Number(row.total_pago ?? 0),
        overdue: Number(row.vencidas ?? 0),
        noBank: Number(row.sem_vinculo ?? 0),
        pendingConc: Number(row.pendente_conc ?? 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha ao calcular KPIs (parcelas)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
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
        kpis: { count: 0, total: 0, paid: 0, overdue: 0, noBank: 0, pendingConc: 0 },
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

