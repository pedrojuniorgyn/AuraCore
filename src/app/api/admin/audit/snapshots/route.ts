import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditFinPool } from "@/lib/audit/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Autorização: token (preferencial para automação) OU sessão admin (fallback)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");

  if (token) {
    if (!headerToken || headerToken !== token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  } else {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
  }

  const debugRequested = req.headers.get("x-audit-debug") === "1";

  try {
    const audit = await getAuditFinPool();
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
