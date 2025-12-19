import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const querySchema = z.object({
  runId: z.string().uuid().optional(),
  sinceDays: z.coerce.number().int().min(0).max(3650).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
  status: z.string().max(50).optional(), // status é string no AuditFinDB
  operacao: z.enum(["PAGAMENTO", "RECEBIMENTO"]).optional(),
  onlyOpen: z.coerce.boolean().optional(),
  onlyOverdue: z.coerce.boolean().optional(),
  onlyNoBankLink: z.coerce.boolean().optional(),
  onlyPendingConciliation: z.coerce.boolean().optional(),
});

async function listParcelas(
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

    const {
      runId,
      sinceDays,
      limit,
      status,
      operacao,
      onlyOpen,
      onlyOverdue,
      onlyNoBankLink,
      onlyPendingConciliation,
    } = parsed.data;

    const sinceDaysSafe = Number.isFinite(sinceDays ?? 0) ? (sinceDays ?? 0) : 0;
    const limitSafe = Number.isFinite(limit ?? 0) ? (limit ?? 500) : 500;

    const audit = await getAuditFinPool();

    const cols = await audit.request().query(`
      SELECT
        COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') as org_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') as branch_col,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') as cb_inf_col,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_regra') as cb_regra_col,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_confidence') as cb_conf_col,
        COL_LENGTH('dbo.audit_fact_parcelas', 'is_conta_bancaria_inferida') as cb_isinf_col,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') as cb_eff_col
    `);
    const orgColExists = (cols.recordset?.[0] as any)?.org_col != null;
    const branchColExists = (cols.recordset?.[0] as any)?.branch_col != null;
    const hasInferCols = (cols.recordset?.[0] as any)?.cb_inf_col != null;
    const hasEffCol = (cols.recordset?.[0] as any)?.cb_eff_col != null;

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
      .input("status", (status ?? null) as any)
      .input("operacao", (operacao ?? null) as any)
      .input("only_open", onlyOpen ? 1 : 0)
      .input("only_overdue", onlyOverdue ? 1 : 0)
      .input("only_no_bank_link", onlyNoBankLink ? 1 : 0)
      .input("only_pending_conc", onlyPendingConciliation ? 1 : 0)
      .input("org_id", (opts.organizationId ?? null) as any)
      .input("branch_id", (opts.branchId ?? null) as any)
      .input("is_admin", opts.isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT TOP (@limit)
          f.run_id,
          f.parcela_id,
          f.movimento_id,
          f.compra_id,
          f.pessoa_id,
          f.codigo_empresa_filial,
          f.centro_custo_id,
          f.plano_contas_contabil_id,
          f.numero_documento,
          f.operacao,
          f.data_documento,
          f.data_vencimento,
          f.data_pagamento_real,
          f.data_lancamento_banco,
          f.valor_parcela,
          f.valor_pago,
          f.codigo_pagamento,
          f.conta_bancaria_id,
          f.qtd_mov_banco,
          f.has_vinculo_bancario,
          f.bool_conciliado,
          f.status,
          ${hasInferCols ? "f.conta_bancaria_id_inferida as conta_bancaria_id_inferida," : "CAST(NULL as bigint) as conta_bancaria_id_inferida,"}
          ${hasInferCols ? "f.conta_bancaria_inferida_regra as conta_bancaria_inferida_regra," : "CAST(NULL as nvarchar(50)) as conta_bancaria_inferida_regra,"}
          ${hasInferCols ? "f.conta_bancaria_inferida_confidence as conta_bancaria_inferida_confidence," : "CAST(NULL as tinyint) as conta_bancaria_inferida_confidence,"}
          ${hasInferCols ? "f.is_conta_bancaria_inferida as is_conta_bancaria_inferida," : "CAST(NULL as bit) as is_conta_bancaria_inferida,"}
          ${hasEffCol ? "f.conta_bancaria_id_efetiva as conta_bancaria_id_efetiva," : "CAST(NULL as bigint) as conta_bancaria_id_efetiva,"}
          r.started_at,
          r.period_start,
          r.period_end,
          ${branchColExists ? "r.branch_id as branch_id," : "CAST(NULL as int) as branch_id,"}
          ${orgColExists ? "r.organization_id as organization_id" : "CAST(NULL as int) as organization_id"}
        FROM dbo.audit_fact_parcelas f
        INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = f.run_id
        WHERE 1=1
          AND (@run_id IS NULL OR f.run_id = @run_id)
          AND (@since_days = 0 OR r.started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME()))
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
          })
        ORDER BY r.started_at DESC, f.data_vencimento DESC, f.parcela_id DESC;
      `
      );

    const items = (r.recordset ?? []).map((row: any) => {
      const started = row.started_at ? new Date(String(row.started_at)) : null;
      const dv = row.data_vencimento ? new Date(String(row.data_vencimento)) : null;
      const dd = row.data_documento ? new Date(String(row.data_documento)) : null;
      const dp = row.data_pagamento_real ? new Date(String(row.data_pagamento_real)) : null;
      const dl = row.data_lancamento_banco ? new Date(String(row.data_lancamento_banco)) : null;

      return {
        runId: String(row.run_id),
        parcelaId: row.parcela_id == null ? null : Number(row.parcela_id),
        movimentoId: row.movimento_id == null ? null : Number(row.movimento_id),
        compraId: row.compra_id == null ? null : Number(row.compra_id),
        pessoaId: row.pessoa_id == null ? null : Number(row.pessoa_id),
        codigoEmpresaFilial: row.codigo_empresa_filial == null ? null : Number(row.codigo_empresa_filial),
        centroCustoId: row.centro_custo_id == null ? null : Number(row.centro_custo_id),
        planoContasContabilId: row.plano_contas_contabil_id == null ? null : Number(row.plano_contas_contabil_id),
        numeroDocumento: row.numero_documento == null ? null : Number(row.numero_documento),
        operacao: row.operacao ? String(row.operacao) : null,
        dataDocumento: dd ? dd.toISOString() : null,
        dataVencimento: dv ? dv.toISOString() : null,
        dataPagamentoReal: dp ? dp.toISOString() : null,
        dataLancamentoBanco: dl ? dl.toISOString() : null,
        valorParcela: row.valor_parcela == null ? null : Number(row.valor_parcela),
        valorPago: row.valor_pago == null ? null : Number(row.valor_pago),
        codigoPagamento: row.codigo_pagamento == null ? null : Number(row.codigo_pagamento),
        contaBancariaId: row.conta_bancaria_id == null ? null : Number(row.conta_bancaria_id),
        contaBancariaIdInferida: row.conta_bancaria_id_inferida == null ? null : Number(row.conta_bancaria_id_inferida),
        contaBancariaInferidaRegra: row.conta_bancaria_inferida_regra ? String(row.conta_bancaria_inferida_regra) : null,
        contaBancariaInferidaConfidence:
          row.conta_bancaria_inferida_confidence == null ? null : Number(row.conta_bancaria_inferida_confidence),
        isContaBancariaInferida: row.is_conta_bancaria_inferida == null ? null : Boolean(row.is_conta_bancaria_inferida),
        contaBancariaIdEfetiva: row.conta_bancaria_id_efetiva == null ? null : Number(row.conta_bancaria_id_efetiva),
        hasVinculoBancario: row.has_vinculo_bancario == null ? null : Boolean(row.has_vinculo_bancario),
        boolConciliado: row.bool_conciliado == null ? null : Boolean(row.bool_conciliado),
        status: row.status ? String(row.status) : null,
        startedAt: started ? started.toISOString() : null,
        branchId: row.branch_id == null ? null : Number(row.branch_id),
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao listar parcelas",
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
    return listParcelas(req, {
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
    return listParcelas(req, {
      organizationId: ctx.organizationId,
      branchId: null,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

