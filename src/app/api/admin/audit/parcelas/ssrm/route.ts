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

const ssrmBodySchema = z.object({
  startRow: z.coerce.number().int().min(0),
  endRow: z.coerce.number().int().min(1),
  sortModel: z
    .array(
      z.object({
        colId: z.string().min(1),
        sort: z.enum(["asc", "desc"]),
      })
    )
    .default([]),
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
  // aceita "YYYY-MM-DD" ou ISO
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

type TenantOpts = { organizationId: number | null; isAdmin: boolean; allowedBranches: number[]; branchId: number | null };

async function handle(req: NextRequest, opts: TenantOpts) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const body = ssrmBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: "Body inválido", details: body.error.flatten() }, { status: 400 });
    }

    const { startRow, endRow, sortModel, filterModel, query } = body.data;
    const takeRaw = endRow - startRow;
    const take = Math.max(1, Math.min(500, takeRaw)); // proteção
    const offset = startRow;

    const dateFieldSafe = (query.dateField ?? "SNAPSHOT") as NonNullable<typeof query.dateField>;
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
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') as cb_inf_col,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_regra') as cb_regra_col,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') as cb_eff_col,
        COL_LENGTH('dbo.audit_raw_movimentos', 'plano_contas_contabil_nome') as pcc_nome_col,
        COL_LENGTH('dbo.audit_raw_movimentos', 'movimento_descricao') as mov_desc_col,
        OBJECT_ID('dbo.audit_raw_conta_bancaria','U') as cb_obj,
        COL_LENGTH('dbo.audit_raw_conta_bancaria', 'descricao') as cb_desc_col,
        COL_LENGTH('dbo.audit_raw_conta_bancaria', 'nome_banco') as cb_nome_banco_col,
        COL_LENGTH('dbo.audit_raw_conta_bancaria', 'agencia') as cb_agencia_col,
        COL_LENGTH('dbo.audit_raw_conta_bancaria', 'numero_conta') as cb_numero_col;
    `);
    const orgColExists = (cols.recordset?.[0] as any)?.org_col != null;
    const branchColExists = (cols.recordset?.[0] as any)?.branch_col != null;
    const hasInferCols = (cols.recordset?.[0] as any)?.cb_inf_col != null;
    const hasEffCol = (cols.recordset?.[0] as any)?.cb_eff_col != null;
    const hasPccNomeCol = (cols.recordset?.[0] as any)?.pcc_nome_col != null;
    const hasMovDescCol = (cols.recordset?.[0] as any)?.mov_desc_col != null;
    const cbTableExists = Boolean((cols.recordset?.[0] as any)?.cb_obj);
    const hasCbDescCol = (cols.recordset?.[0] as any)?.cb_desc_col != null;
    const hasCbNomeBancoCol = (cols.recordset?.[0] as any)?.cb_nome_banco_col != null;
    const hasCbAgenciaCol = (cols.recordset?.[0] as any)?.cb_agencia_col != null;
    const hasCbNumeroCol = (cols.recordset?.[0] as any)?.cb_numero_col != null;

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

    const contaJoinExpr = hasEffCol
      ? "f.conta_bancaria_id_efetiva"
      : hasInferCols
        ? "COALESCE(f.conta_bancaria_id, f.conta_bancaria_id_inferida)"
        : "f.conta_bancaria_id";

    const whereParts: string[] = ["1=1"];
    const orderParts: string[] = [];

    const request = audit.request();
    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    request.input("offset", offset);
    request.input("take", take);
    request.input("run_id", (query.runId ?? null) as any);
    request.input("since_days", Number.isFinite(query.sinceDays ?? 0) ? (query.sinceDays ?? 0) : 0);
    request.input("start_date", (startDateSafe ?? null) as any);
    request.input("end_date", (endDateSafe ?? null) as any);
    request.input("status", (query.status ?? null) as any);
    request.input("operacao", (query.operacao ?? null) as any);
    request.input("only_open", query.onlyOpen ? 1 : 0);
    request.input("only_overdue", query.onlyOverdue ? 1 : 0);
    request.input("only_no_bank_link", query.onlyNoBankLink ? 1 : 0);
    request.input("only_pending_conc", query.onlyPendingConciliation ? 1 : 0);
    request.input("org_id", (opts.organizationId ?? null) as any);
    request.input("branch_id", (opts.branchId ?? null) as any);
    request.input("is_admin", opts.isAdmin ? 1 : 0);
    request.input("allowed_branch_ids", branchIdsCsv);

    whereParts.push("(@run_id IS NULL OR f.run_id = @run_id)");
    whereParts.push(
      `(
        (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR r.started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
        OR
        (@start_date IS NOT NULL OR @end_date IS NOT NULL)
      )`
    );
    whereParts.push(`(@start_date IS NULL OR ${dateCol} >= @start_date)`);
    whereParts.push(`(@end_date IS NULL OR ${dateCol} <= @end_date)`);
    whereParts.push("(@status IS NULL OR f.status = @status)");
    whereParts.push("(@operacao IS NULL OR f.operacao = @operacao)");
    whereParts.push("(@only_open = 0 OR f.status IN ('ABERTA','VENCIDA','SEM_VINCULO_BANCARIO','PENDENTE_CONCILIACAO'))");
    whereParts.push(
      "(@only_overdue = 0 OR (f.data_vencimento IS NOT NULL AND f.data_vencimento < SYSUTCDATETIME() AND f.status IN ('ABERTA','VENCIDA','SEM_VINCULO_BANCARIO','PENDENTE_CONCILIACAO')))"
    );
    whereParts.push("(@only_no_bank_link = 0 OR f.has_vinculo_bancario = 0)");
    whereParts.push("(@only_pending_conc = 0 OR f.status = 'PENDENTE_CONCILIACAO')");
    whereParts.push(orgColExists ? "(@org_id IS NULL OR r.organization_id = @org_id)" : "1=1");
    whereParts.push(branchColExists ? "(@branch_id IS NULL OR r.branch_id = @branch_id)" : "1=1");
    whereParts.push(
      branchColExists
        ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR r.branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
        : "1=1"
    );

    // filtros vindos do grid
    const colMap: Record<string, { col: string; kind: "text" | "number" | "date" | "set" | "bool" }> = {
      numeroDocumento: { col: "f.numero_documento", kind: "number" },
      parcelaId: { col: "f.parcela_id", kind: "number" },
      movimentoId: { col: "f.movimento_id", kind: "number" },
      planoContasContabilId: { col: "f.plano_contas_contabil_id", kind: "number" },
      planoContasContabilNome: { col: hasPccNomeCol ? "m.plano_contas_contabil_nome" : "CAST(NULL as nvarchar(255))", kind: "text" },
      movimentoDescricao: { col: hasMovDescCol ? "m.movimento_descricao" : "CAST(NULL as nvarchar(500))", kind: "text" },
      dataVencimento: { col: "f.data_vencimento", kind: "date" },
      dataPagamentoReal: { col: "f.data_pagamento_real", kind: "date" },
      dataLancamentoBanco: { col: "f.data_lancamento_banco", kind: "date" },
      valorParcela: { col: "f.valor_parcela", kind: "number" },
      valorPago: { col: "f.valor_pago", kind: "number" },
      status: { col: "f.status", kind: "set" },
      hasVinculoBancario: { col: "f.has_vinculo_bancario", kind: "bool" },
      boolConciliado: { col: "f.bool_conciliado", kind: "bool" },
      contaBancariaId: { col: "f.conta_bancaria_id", kind: "number" },
      contaBancariaIdInferida: { col: hasInferCols ? "f.conta_bancaria_id_inferida" : "CAST(NULL as bigint)", kind: "number" },
      contaBancariaInferidaRegra: { col: hasInferCols ? "f.conta_bancaria_inferida_regra" : "CAST(NULL as nvarchar(50))", kind: "text" },
      contaBancariaIdEfetiva: { col: hasEffCol ? "f.conta_bancaria_id_efetiva" : "CAST(NULL as bigint)", kind: "number" },
      codigoEmpresaFilial: { col: "f.codigo_empresa_filial", kind: "number" },
      branchId: { col: branchColExists ? "r.branch_id" : "CAST(NULL as int)", kind: "number" },
      runId: { col: "f.run_id", kind: "text" },
    };

    let p = 0;
    for (const [field, fm] of Object.entries(filterModel ?? {})) {
      const meta = colMap[field];
      if (!meta) continue;

      const param = (suffix: string) => `${field}_${suffix}_${p++}`;
      const col = meta.col;

      // set filter
      if (fm?.filterType === "set" && Array.isArray(fm?.values) && fm.values.length) {
        const names = fm.values.map((v: any) => String(v));
        const csv = names.join(",");
        const k = param("set");
        request.input(k, csv);
        whereParts.push(`${col} IN (SELECT value FROM string_split(@${k}, ','))`);
        continue;
      }

      // boolean filter (tenta tratar como set/text também)
      if (meta.kind === "bool") {
        const raw = fm?.filter ?? fm?.values?.[0];
        if (raw === undefined || raw === null || raw === "") continue;
        const b = String(raw).toLowerCase();
        const v = b === "true" || b === "1" || b === "sim" ? 1 : 0;
        const k = param("b");
        request.input(k, v);
        whereParts.push(`${col} = @${k}`);
        continue;
      }

      // date filter
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

      // number filter
      if (fm?.filterType === "number") {
        const type = String(fm?.type ?? "");
        const a = fm?.filter;
        const b = fm?.filterTo;
        if (type === "inRange" && a != null && b != null) {
          const k1 = param("n1");
          const k2 = param("n2");
          request.input(k1, Number(a));
          request.input(k2, Number(b));
          whereParts.push(`(${col} >= @${k1} AND ${col} <= @${k2})`);
        } else if (a != null) {
          const k = param("n");
          request.input(k, Number(a));
          const op =
            type === "equals"
              ? "="
              : type === "notEqual"
                ? "<>"
                : type === "lessThan"
                  ? "<"
                  : type === "lessThanOrEqual"
                    ? "<="
                    : type === "greaterThan"
                      ? ">"
                      : type === "greaterThanOrEqual"
                        ? ">="
                        : "=";
          whereParts.push(`${col} ${op} @${k}`);
        }
        continue;
      }

      // text filter (default)
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

    // sort vindo do grid
    for (const s of sortModel.slice(0, 5)) {
      const meta = colMap[s.colId];
      if (!meta) continue;
      orderParts.push(`${meta.col} ${s.sort.toUpperCase()}`);
    }
    if (!orderParts.length) {
      orderParts.push(`${dateCol} DESC`, "r.started_at DESC", "f.parcela_id DESC");
    }

    const whereSql = whereParts.join("\n  AND ");
    const orderSql = orderParts.join(", ");

    const rowsQuery = `
      SELECT
        f.run_id,
        f.parcela_id,
        f.movimento_id,
        f.compra_id,
        f.pessoa_id,
        f.codigo_empresa_filial,
        f.plano_contas_contabil_id,
        ${hasPccNomeCol ? "m.plano_contas_contabil_nome as plano_contas_contabil_nome," : "CAST(NULL as nvarchar(255)) as plano_contas_contabil_nome,"}
        ${hasMovDescCol ? "m.movimento_descricao as movimento_descricao," : "CAST(NULL as nvarchar(500)) as movimento_descricao,"}
        ${
          cbTableExists && (hasCbDescCol || hasCbNomeBancoCol || hasCbAgenciaCol || hasCbNumeroCol)
            ? "cb.descricao as conta_bancaria_descricao,"
            : "CAST(NULL as nvarchar(255)) as conta_bancaria_descricao,"
        }
        ${cbTableExists && hasCbNomeBancoCol ? "cb.nome_banco as conta_bancaria_nome_banco," : "CAST(NULL as nvarchar(255)) as conta_bancaria_nome_banco,"}
        ${cbTableExists && hasCbAgenciaCol ? "cb.agencia as conta_bancaria_agencia," : "CAST(NULL as nvarchar(50)) as conta_bancaria_agencia,"}
        ${cbTableExists && hasCbNumeroCol ? "cb.numero_conta as conta_bancaria_numero_conta," : "CAST(NULL as nvarchar(50)) as conta_bancaria_numero_conta,"}
        f.numero_documento,
        f.operacao,
        f.data_documento,
        f.data_vencimento,
        f.data_pagamento_real,
        f.data_lancamento_banco,
        f.valor_parcela,
        f.valor_pago,
        f.conta_bancaria_id,
        f.has_vinculo_bancario,
        f.bool_conciliado,
        f.status,
        ${hasInferCols ? "f.conta_bancaria_id_inferida as conta_bancaria_id_inferida," : "CAST(NULL as bigint) as conta_bancaria_id_inferida,"}
        ${hasInferCols ? "f.conta_bancaria_inferida_regra as conta_bancaria_inferida_regra," : "CAST(NULL as nvarchar(50)) as conta_bancaria_inferida_regra,"}
        ${hasEffCol ? "f.conta_bancaria_id_efetiva as conta_bancaria_id_efetiva," : "CAST(NULL as bigint) as conta_bancaria_id_efetiva,"}
        r.started_at,
        ${branchColExists ? "r.branch_id as branch_id" : "CAST(NULL as int) as branch_id"}
      FROM dbo.audit_fact_parcelas f
      INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = f.run_id
      LEFT JOIN dbo.audit_raw_movimentos m ON m.run_id = f.run_id AND m.movimento_id = f.movimento_id
      ${cbTableExists ? `LEFT JOIN dbo.audit_raw_conta_bancaria cb ON cb.run_id = f.run_id AND cb.conta_bancaria_id = ${contaJoinExpr}` : ""}
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      OFFSET @offset ROWS FETCH NEXT @take ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT_BIG(1) as total
      FROM dbo.audit_fact_parcelas f
      INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = f.run_id
      LEFT JOIN dbo.audit_raw_movimentos m ON m.run_id = f.run_id AND m.movimento_id = f.movimento_id
      ${cbTableExists ? `LEFT JOIN dbo.audit_raw_conta_bancaria cb ON cb.run_id = f.run_id AND cb.conta_bancaria_id = ${contaJoinExpr}` : ""}
      WHERE ${whereSql};
    `;

    const [rowsRes, countRes] = await Promise.all([request.query(rowsQuery), request.query(countQuery)]);

    const total = Number((countRes.recordset?.[0] as any)?.total ?? 0);
    const rows = (rowsRes.recordset ?? []).map((row: any) => {
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
        planoContasContabilId: row.plano_contas_contabil_id == null ? null : Number(row.plano_contas_contabil_id),
        planoContasContabilNome: row.plano_contas_contabil_nome ? String(row.plano_contas_contabil_nome) : null,
        movimentoDescricao: row.movimento_descricao ? String(row.movimento_descricao) : null,
        contaBancariaDescricao: row.conta_bancaria_descricao ? String(row.conta_bancaria_descricao) : null,
        contaBancariaNomeBanco: row.conta_bancaria_nome_banco ? String(row.conta_bancaria_nome_banco) : null,
        contaBancariaAgencia: row.conta_bancaria_agencia ? String(row.conta_bancaria_agencia) : null,
        contaBancariaNumeroConta: row.conta_bancaria_numero_conta ? String(row.conta_bancaria_numero_conta) : null,
        numeroDocumento: row.numero_documento == null ? null : Number(row.numero_documento),
        operacao: row.operacao ? String(row.operacao) : null,
        dataDocumento: dd ? dd.toISOString() : null,
        dataVencimento: dv ? dv.toISOString() : null,
        dataPagamentoReal: dp ? dp.toISOString() : null,
        dataLancamentoBanco: dl ? dl.toISOString() : null,
        valorParcela: row.valor_parcela == null ? null : Number(row.valor_parcela),
        valorPago: row.valor_pago == null ? null : Number(row.valor_pago),
        contaBancariaId: row.conta_bancaria_id == null ? null : Number(row.conta_bancaria_id),
        contaBancariaIdInferida: row.conta_bancaria_id_inferida == null ? null : Number(row.conta_bancaria_id_inferida),
        contaBancariaInferidaRegra: row.conta_bancaria_inferida_regra ? String(row.conta_bancaria_inferida_regra) : null,
        contaBancariaIdEfetiva: row.conta_bancaria_id_efetiva == null ? null : Number(row.conta_bancaria_id_efetiva),
        hasVinculoBancario: row.has_vinculo_bancario == null ? null : Boolean(row.has_vinculo_bancario),
        boolConciliado: row.bool_conciliado == null ? null : Boolean(row.bool_conciliado),
        status: row.status ? String(row.status) : null,
        startedAt: started ? started.toISOString() : null,
        branchId: row.branch_id == null ? null : Number(row.branch_id),
      };
    });

    return NextResponse.json({ success: true, rows, lastRow: total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha SSRM (parcelas)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
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

