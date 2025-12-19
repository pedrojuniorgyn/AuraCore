import { NextRequest, NextResponse } from "next/server";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

async function listSnapshots(req: Request) {
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const debugRequested = req.headers.get("x-audit-debug") === "1";

  try {
    const audit = await getAuditFinPool();
    // Limpeza leve: runs "pendurados" (processo morreu/redeploy) não podem ficar eternamente RUNNING.
    // Snapshot típico termina em poucos minutos; por segurança usamos tolerância alta.
    const staleMinutes = Number(process.env.AUDIT_SNAPSHOT_STALE_MINUTES || "120");
    if (Number.isFinite(staleMinutes) && staleMinutes > 0) {
      await audit
        .request()
        .input("mins", staleMinutes)
        .query(
          `
          UPDATE dbo.audit_snapshot_runs
          SET status = 'FAILED',
              finished_at = SYSUTCDATETIME(),
              error_message = COALESCE(error_message, CONCAT('Stale run: excedeu ', CONVERT(varchar(20), @mins), 'min (provável recycle/redeploy).'))
          WHERE finished_at IS NULL
            AND status IN ('RUNNING','QUEUED')
            AND started_at IS NOT NULL
            AND DATEDIFF(minute, started_at, SYSUTCDATETIME()) > @mins;
        `
        );
    }
    const r = await audit.request().query(`
      SELECT TOP 50
        run_id,
        status,
        started_at,
        finished_at,
        period_start,
        period_end,
        error_message
      FROM dbo.audit_snapshot_runs
      ORDER BY started_at DESC;
    `);

    return NextResponse.json({
      success: true,
      items: (r.recordset ?? []).map((x) => {
        const row = x as unknown as Record<string, unknown>;
        const started = row.started_at ? new Date(String(row.started_at)) : null;
        const finished = row.finished_at ? new Date(String(row.finished_at)) : null;
        const pStart = row.period_start ? new Date(String(row.period_start)) : null;
        const pEnd = row.period_end ? new Date(String(row.period_end)) : null;

        return {
          runId: String(row.run_id),
          status: String(row.status),
          startedAt: started ? started.toISOString() : null,
          finishedAt: finished ? finished.toISOString() : null,
          periodStart: pStart ? pStart.toISOString().slice(0, 10) : null,
          periodEnd: pEnd ? pEnd.toISOString().slice(0, 10) : null,
          errorMessage: row.error_message ? String(row.error_message) : null,
        };
      }),
    });
  } catch (err) {
    const isProd = process.env.NODE_ENV === "production";
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao listar snapshots",
        ...(isProd && !debugRequested ? {} : { debug: { message } }),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Autorização: token (preferencial para automação) OU permissão via sessão (RBAC)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) return listSnapshots(req);

  // Mesmo sem ser ADMIN, pode acessar se tiver permissão (ex.: role AUDITOR).
  return withPermission(req, "audit.read", async () => listSnapshots(req));
}
