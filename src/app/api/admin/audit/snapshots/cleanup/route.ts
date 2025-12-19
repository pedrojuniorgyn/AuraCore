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

async function cleanup(req: NextRequest, appliedBy: string) {
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

    const before = await audit
      .request()
      .input("days", olderThanDays)
      .input("only_failed", onlyFailed ? 1 : 0)
      .query(
        `
        SELECT COUNT(1) as cnt
        FROM dbo.audit_snapshot_runs
        WHERE started_at < DATEADD(day, -@days, SYSUTCDATETIME())
          AND (@only_failed = 0 OR status = 'FAILED');
      `
      );

    const runsToDelete = Number((before.recordset?.[0] as any)?.cnt ?? 0);

    // Deleta em todas as tabelas audit_* que possuam coluna run_id, exceto audit_snapshot_runs.
    await audit
      .request()
      .input("cutoff_days", olderThanDays)
      .input("only_failed", onlyFailed ? 1 : 0)
      .query(
        `
        DECLARE @cutoff datetime2 = DATEADD(day, -@cutoff_days, SYSUTCDATETIME());
        DECLARE @onlyFailed bit = CASE WHEN @only_failed = 1 THEN 1 ELSE 0 END;

        DECLARE @sql nvarchar(max) = N'';

        SELECT @sql = @sql + N'
          IF OBJECT_ID(''' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N''',''U'') IS NOT NULL
          BEGIN
            DELETE target
            FROM ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N' AS target
            INNER JOIN dbo.audit_snapshot_runs r ON r.run_id = target.run_id
            WHERE r.started_at < @cutoff
              AND (@onlyFailed = 0 OR r.status = ''FAILED'');
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
          N'@cutoff datetime2, @onlyFailed bit',
          @cutoff = @cutoff,
          @onlyFailed = @onlyFailed;

        DELETE FROM dbo.audit_snapshot_runs
        WHERE started_at < @cutoff
          AND (@onlyFailed = 0 OR status = 'FAILED');
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
  if (tokenOk) return cleanup(req, "system");

  // Operação administrativa: exige permissão de migração (ou ADMIN)
  return withPermission(req, "audit.migrate", async (user) => cleanup(req, user.email ?? user.id));
}

