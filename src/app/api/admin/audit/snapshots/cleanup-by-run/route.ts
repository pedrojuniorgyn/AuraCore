import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    runId: z.string().uuid(),
    deleteData: z.boolean().default(true),
  })
  .strict();

type TenantOpts = { organizationId: number | null; isAdmin: boolean; allowedBranches: number[]; branchId: number | null };

async function cleanupByRun(req: NextRequest, appliedBy: string, opts: TenantOpts) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const bodyRaw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const { runId, deleteData } = parsed.data;

    const audit = await getAuditFinPool();

    const hasCols = await audit.request().query(`
      SELECT
        COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') as org_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') as branch_col;
    `);
    const orgColExists = (hasCols.recordset?.[0] as any)?.org_col != null;
    const branchColExists = (hasCols.recordset?.[0] as any)?.branch_col != null;

    const branchIdsCsv = opts.allowedBranches.length ? opts.allowedBranches.join(",") : "";

    // Garante escopo antes de deletar
    const exists = await audit
      .request()
      .input("run_id", runId)
      .input("org_id", (opts.organizationId ?? null) as any)
      .input("branch_id", (opts.branchId ?? null) as any)
      .input("is_admin", opts.isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT TOP 1 run_id
        FROM dbo.audit_snapshot_runs
        WHERE run_id = @run_id
          AND (${orgColExists ? "(@org_id IS NULL OR organization_id = @org_id)" : "1=1"})
          AND (${branchColExists ? "(@branch_id IS NULL OR branch_id = @branch_id)" : "1=1"})
          AND (${
            branchColExists
              ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
              : "1=1"
          });
      `
      );

    if (!exists.recordset?.length) {
      return NextResponse.json({ error: "Run não encontrado (ou sem acesso)" }, { status: 404 });
    }

    // Delete data in audit_* tables by run_id (except audit_snapshot_runs), then delete run
    if (deleteData) {
      await audit
        .request()
        .input("run_id", runId)
        .query(
          `
          DECLARE @sql nvarchar(max) = N'';

          SELECT @sql = @sql + N'
            IF OBJECT_ID(''' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N''',''U'') IS NOT NULL
            BEGIN
              DELETE target
              FROM ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N' AS target
              WHERE target.run_id = @runId;
            END;
          '
          FROM sys.tables t
          INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
          INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.name = 'run_id'
          WHERE s.name = 'dbo'
            AND t.name LIKE 'audit[_]%'
            AND t.name <> 'audit_snapshot_runs';

          EXEC sp_executesql @sql, N'@runId uniqueidentifier', @runId = @run_id;
        `
        );
    }

    await audit
      .request()
      .input("run_id", runId)
      .query(
        `
        DELETE FROM dbo.audit_snapshot_runs
        WHERE run_id = @run_id;
      `
      );

    return NextResponse.json({ success: true, appliedBy, runId, deletedData: deleteData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha ao excluir snapshot por runId", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // token de infra (automação) OU permissão audit.migrate (op administrativa)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) {
    const orgHeader = req.headers.get("x-organization-id");
    const parsedOrg = orgHeader ? Number(orgHeader) : NaN;
    const organizationId = Number.isFinite(parsedOrg) ? parsedOrg : null;
    const branchHeader = req.headers.get("x-branch-id");
    const parsedBranch = branchHeader ? Number(branchHeader) : NaN;
    const branchId = Number.isFinite(parsedBranch) ? parsedBranch : null;
    return cleanupByRun(req, "system", { organizationId, branchId, isAdmin: true, allowedBranches: [] });
  }

  return withPermission(req, "audit.migrate", async (user, ctx) => {
    if (!ctx.isAdmin && (!ctx.allowedBranches || ctx.allowedBranches.length === 0)) {
      return NextResponse.json({ error: "Sem escopo de filiais para operação administrativa" }, { status: 403 });
    }
    return cleanupByRun(req, user.email ?? user.id, {
      organizationId: ctx.organizationId,
      branchId: null,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

