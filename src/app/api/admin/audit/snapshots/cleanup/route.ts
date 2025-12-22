import { NextRequest, NextResponse } from "next/server";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    olderThanDays: z.number().int().min(1).max(3650).default(30),
    onlyFailed: z.boolean().default(true),
  })
  .strict();

async function cleanup(
  req: NextRequest,
  appliedBy: string,
  opts?: { organizationId?: number | null; isAdmin?: boolean; allowedBranches?: number[]; branchId?: number | null }
) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const bodyRaw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { olderThanDays, onlyFailed } = parsed.data;

    const audit = await getAuditFinPool();

    // Detecta se existe coluna organization_id / branch_id no schema de runs
    const hasCols = await audit.request().query(`
      SELECT
        COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') as org_col,
        COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') as branch_col;
    `);
    const orgColExists = (hasCols.recordset?.[0] as any)?.org_col != null;
    const branchColExists = (hasCols.recordset?.[0] as any)?.branch_col != null;

    const orgId = opts?.organizationId ?? null;
    const explicitBranchId = opts?.branchId ?? null;
    const isAdmin = opts?.isAdmin === true;
    const allowedBranches = Array.isArray(opts?.allowedBranches) ? opts?.allowedBranches ?? [] : [];
    const branchIdsCsv = allowedBranches.length ? allowedBranches.join(",") : "";

    const before = await audit
      .request()
      .input("days", olderThanDays)
      .input("only_failed", onlyFailed ? 1 : 0)
      .input("org_id", orgId as any)
      .input("branch_id", explicitBranchId as any)
      .input("is_admin", isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        SELECT COUNT(1) as cnt
        FROM dbo.audit_snapshot_runs
        WHERE started_at < DATEADD(day, -@days, SYSUTCDATETIME())
          AND (@only_failed = 0 OR status = 'FAILED')
          AND (${orgColExists ? "(@org_id IS NULL OR organization_id = @org_id)" : "1=1"})
          AND (${branchColExists ? "(@branch_id IS NULL OR branch_id = @branch_id)" : "1=1"})
          AND (${
            branchColExists
              ? "(@is_admin = 1 OR @allowed_branch_ids = '' OR branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowed_branch_ids, ',')))"
              : "1=1"
          });
      `
      );

    const runsToDelete = Number((before.recordset?.[0] as any)?.cnt ?? 0);

    // Deleta em todas as tabelas audit_* que possuam coluna run_id, exceto audit_snapshot_runs.
    await audit
      .request()
      .input("cutoff_days", olderThanDays)
      .input("only_failed", onlyFailed ? 1 : 0)
      .input("org_id", orgId as any)
      .input("branch_id", explicitBranchId as any)
      .input("is_admin", isAdmin ? 1 : 0)
      .input("allowed_branch_ids", branchIdsCsv)
      .query(
        `
        DECLARE @cutoff datetime2 = DATEADD(day, -@cutoff_days, SYSUTCDATETIME());
        DECLARE @onlyFailed bit = CASE WHEN @only_failed = 1 THEN 1 ELSE 0 END;
        DECLARE @orgId int = @org_id;
        DECLARE @branchId int = @branch_id;
        DECLARE @isAdmin bit = CASE WHEN @is_admin = 1 THEN 1 ELSE 0 END;
        DECLARE @allowedBranchIds nvarchar(max) = @allowed_branch_ids;

        DECLARE @sql nvarchar(max) = N'';

        SELECT @sql = @sql + N'
          IF OBJECT_ID(''' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N''',''U'') IS NOT NULL
          BEGIN
            DELETE target
            FROM ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N' AS target
            INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = target.run_id
            WHERE r.started_at < @cutoff
              AND (@onlyFailed = 0 OR r.status = ''FAILED'')
              AND (' + CASE WHEN ${orgColExists ? 1 : 0} = 1 THEN N'(@orgId IS NULL OR r.organization_id = @orgId)' ELSE N'1=1' END + N')
              AND (' + CASE WHEN ${branchColExists ? 1 : 0} = 1 THEN N'(@branchId IS NULL OR r.branch_id = @branchId)' ELSE N'1=1' END + N')
              AND (' + CASE WHEN ${branchColExists ? 1 : 0} = 1 THEN N'(@isAdmin = 1 OR @allowedBranchIds = '''' OR r.branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowedBranchIds, '','')))' ELSE N'1=1' END + N');
          END;
        '
        FROM sys.tables t
        INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
        INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.name = 'run_id'
        WHERE s.name = 'dbo'
          AND t.name LIKE 'audit[_]%'
          AND t.name <> 'audit_snapshot_runs';

        EXEC sp_executesql
          @sql,
          N'@cutoff datetime2, @onlyFailed bit, @orgId int, @branchId int, @isAdmin bit, @allowedBranchIds nvarchar(max)',
          @cutoff = @cutoff,
          @onlyFailed = @onlyFailed,
          @orgId = @orgId,
          @branchId = @branchId,
          @isAdmin = @isAdmin,
          @allowedBranchIds = @allowedBranchIds;

        DELETE FROM dbo.audit_snapshot_runs
        WHERE started_at < @cutoff
          AND (@onlyFailed = 0 OR status = 'FAILED')
          AND (${orgColExists ? "(@orgId IS NULL OR organization_id = @orgId)" : "1=1"})
          AND (${branchColExists ? "(@branchId IS NULL OR branch_id = @branchId)" : "1=1"})
          AND (${
            branchColExists
              ? "(@isAdmin = 1 OR @allowedBranchIds = '' OR branch_id IN (SELECT TRY_CAST(value as int) FROM string_split(@allowedBranchIds, ',')))"
              : "1=1"
          });
      `
      );

    return NextResponse.json({
      success: true,
      appliedBy,
      olderThanDays,
      onlyFailed,
      runsDeleted: runsToDelete,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao limpar snapshots antigos",
        ...(isProd && !debugRequested ? {} : { debug: { message } }),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Autorização: token (preferencial para automação) OU permissão via sessão (RBAC)
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
    return cleanup(req, "system", { organizationId, branchId, isAdmin: true, allowedBranches: [] });
  }

  // Operação administrativa: exige permissão de migração (ou ADMIN)
  return withPermission(req, "audit.migrate", async (user, ctx) => {
    if (!ctx.isAdmin && (!ctx.allowedBranches || ctx.allowedBranches.length === 0)) {
      return NextResponse.json({ success: true, appliedBy: user.email ?? user.id, runsDeleted: 0, olderThanDays: 0, onlyFailed: true });
    }
    return cleanup(req, user.email ?? user.id, {
      organizationId: ctx.organizationId,
      isAdmin: ctx.isAdmin,
      allowedBranches: ctx.allowedBranches ?? [],
    });
  });
}

