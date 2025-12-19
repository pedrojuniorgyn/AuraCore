import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const querySchema = z.object({
  runId: z.string().uuid().optional(),
  sinceDays: z.coerce.number().int().min(0).max(3650).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

async function listCashflow(
  req: Request,
  opts: { organizationId: number | null; isAdmin: boolean; allowedBranches: number[]; branchId: number | null }
) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Query inválida", details: parsed.error.flatten() }, { status: 400 });
    }

    const { runId, sinceDays, limit } = parsed.data;
    const sinceDaysSafe = Number.isFinite(sinceDays ?? 0) ? (sinceDays ?? 0) : 0;
    const limitSafe = Number.isFinite(limit ?? 0) ? (limit ?? 2000) : 2000;

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

    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    const r = await audit
      .request()
      .input("limit", limitSafe)
      .input("run_id", (runId ?? null) as any)
      .input("since_days", sinceDaysSafe)
      .input("org_id", (opts.organizationId ?? null) as any)
      .input("branch_id", (opts.branchId ?? null) as any)
      .input("is_admin", opts.isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT TOP (@limit)
          d.run_id,
          d.data,
          d.conta_bancaria_id,
          d.codigo_empresa_filial,
          d.entradas,
          d.saidas,
          d.liquido,
          d.saldo_inicial,
          d.saldo_final,
          d.status_caixa,
          r.started_at,
          r.period_start,
          r.period_end,
          ${branchColExists ? "r.branch_id as branch_id," : "CAST(NULL as int) as branch_id,"}
          ${orgColExists ? "r.organization_id as organization_id" : "CAST(NULL as int) as organization_id"}
        FROM dbo.audit_fact_cashflow_daily d
        INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = d.run_id
        WHERE 1=1
          AND (@run_id IS NULL OR d.run_id = @run_id)
          AND (@since_days = 0 OR r.started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME()))
          AND (${orgColExists ? "(@org_id IS NULL OR r.organization_id = @org_id)" : "1=1"})
          AND (${branchColExists ? "(@branch_id IS NULL OR r.branch_id = @branch_id)" : "1=1"})
          AND (${
            branchColExists
              ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR r.branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
              : "1=1"
          })
        ORDER BY r.started_at DESC, d.data DESC;
      `
      );

    const items = (r.recordset ?? []).map((row: any) => {
      const started = row.started_at ? new Date(String(row.started_at)) : null;
      return {
        runId: String(row.run_id),
        date: row.data ? String(row.data).slice(0, 10) : null,
        contaBancariaId: row.conta_bancaria_id == null ? null : Number(row.conta_bancaria_id),
        codigoEmpresaFilial: row.codigo_empresa_filial == null ? null : Number(row.codigo_empresa_filial),
        entradas: row.entradas == null ? null : Number(row.entradas),
        saidas: row.saidas == null ? null : Number(row.saidas),
        liquido: row.liquido == null ? null : Number(row.liquido),
        saldoInicial: row.saldo_inicial == null ? null : Number(row.saldo_inicial),
        saldoFinal: row.saldo_final == null ? null : Number(row.saldo_final),
        statusCaixa: row.status_caixa ? String(row.status_caixa) : null,
        startedAt: started ? started.toISOString() : null,
        branchId: row.branch_id == null ? null : Number(row.branch_id),
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao listar fluxo de caixa",
        ...(isProd && !debugRequested ? {} : { debug: { message } }),
      },
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
    const orgIdRaw = url.searchParams.get("organizationId");
    const orgId = orgIdRaw ? Number(orgIdRaw) : NaN;
    const branchIdRaw = url.searchParams.get("branchId");
    const branchId = branchIdRaw ? Number(branchIdRaw) : NaN;
    return listCashflow(req, {
      organizationId: Number.isFinite(orgId) ? orgId : null,
      branchId: Number.isFinite(branchId) ? branchId : null,
      isAdmin: true,
      allowedBranches: [],
    });
  }

  return withPermission(req, "audit.read", async (_user, ctx) => {
    if (!ctx.isAdmin && (!ctx.allowedBranches || ctx.allowedBranches.length === 0)) {
      return NextResponse.json({ success: true, items: [] });
    }
    return listCashflow(req, {
      organizationId: ctx.organizationId,
      branchId: null,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

