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

const ssrmBodySchema = z.object({
  startRow: z.coerce.number().int().min(0),
  endRow: z.coerce.number().int().min(1),
  sortModel: z
    .array(z.object({ colId: z.string().min(1), sort: z.enum(["asc", "desc"]) }))
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

    const dateFieldSafe = (query.dateField ?? "DATA") as NonNullable<typeof query.dateField>;
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

    const request = audit.request();
    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    request.input("offset", offset);
    request.input("take", take);
    request.input("run_id", (query.runId ?? null) as any);
    request.input("since_days", Number.isFinite(query.sinceDays ?? 0) ? (query.sinceDays ?? 0) : 0);
    request.input("start_date", (startDateSafe ?? null) as any);
    request.input("end_date", (endDateSafe ?? null) as any);
    request.input("status_caixa", (query.statusCaixa ?? null) as any);
    request.input("org_id", (opts.organizationId ?? null) as any);
    request.input("branch_id", (opts.branchId ?? null) as any);
    request.input("is_admin", opts.isAdmin ? 1 : 0);
    request.input("allowed_branch_ids", branchIdsCsv);

    const whereParts: string[] = ["1=1"];
    whereParts.push("(@run_id IS NULL OR d.run_id = @run_id)");
    whereParts.push(
      `(
        (@start_date IS NULL AND @end_date IS NULL AND (@since_days = 0 OR r.started_at >= DATEADD(day, -@since_days, SYSUTCDATETIME())))
        OR
        (@start_date IS NOT NULL OR @end_date IS NOT NULL)
      )`
    );
    whereParts.push(`(@start_date IS NULL OR ${dateCol} >= @start_date)`);
    whereParts.push(`(@end_date IS NULL OR ${dateCol} <= @end_date)`);
    whereParts.push("(@status_caixa IS NULL OR d.status_caixa = @status_caixa)");
    whereParts.push(orgColExists ? "(@org_id IS NULL OR r.organization_id = @org_id)" : "1=1");
    whereParts.push(branchColExists ? "(@branch_id IS NULL OR r.branch_id = @branch_id)" : "1=1");
    whereParts.push(
      branchColExists
        ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR r.branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
        : "1=1"
    );

    const colMap: Record<string, string> = {
      date: "d.data",
      contaBancariaId: "d.conta_bancaria_id",
      codigoEmpresaFilial: "d.codigo_empresa_filial",
      entradas: "d.entradas",
      saidas: "d.saidas",
      liquido: "d.liquido",
      saldoInicial: "d.saldo_inicial",
      saldoFinal: "d.saldo_final",
      statusCaixa: "d.status_caixa",
      startedAt: "r.started_at",
      branchId: branchColExists ? "r.branch_id" : "CAST(NULL as int)",
      runId: "d.run_id",
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
      orderParts.push(`${dateCol} DESC`, "r.started_at DESC");
    }

    const whereSql = whereParts.join("\n  AND ");
    const orderSql = orderParts.join(", ");

    const rowsQuery = `
      SELECT
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
        ${branchColExists ? "r.branch_id as branch_id" : "CAST(NULL as int) as branch_id"}
      FROM dbo.audit_fact_cashflow_daily d
      INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = d.run_id
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      OFFSET @offset ROWS FETCH NEXT @take ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT_BIG(1) as total
      FROM dbo.audit_fact_cashflow_daily d
      INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = d.run_id
      WHERE ${whereSql};
    `;

    const [rowsRes, countRes] = await Promise.all([request.query(rowsQuery), request.query(countQuery)]);

    const total = Number((countRes.recordset?.[0] as any)?.total ?? 0);
    const rows = (rowsRes.recordset ?? []).map((row: any) => {
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

    return NextResponse.json({ success: true, rows, lastRow: total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha SSRM (cashflow)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
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

