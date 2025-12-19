import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queueSnapshot, runSnapshot } from "@/lib/audit/etl/snapshotRun";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const BodySchema = z.object({
  periodStart: IsoDate.optional(), // YYYY-MM-DD
  periodEnd: IsoDate.optional(), // YYYY-MM-DD (inclusivo)
  axis: z.enum(["VENCIMENTO", "PAGAMENTO_REAL", "DOCUMENTO"]).optional(),
});

function addMonthsUtc(d: Date, months: number): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
}

export async function POST(req: NextRequest) {
  // Autorização: token (preferencial para automação) OU sessão admin
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  let requestedBy = { userId: "system", email: "system" };
  let organizationId: number | null = null;

  const tokenOk = token && headerToken && headerToken === token;
  if (!tokenOk) {
    // Se não vier token, aplica RBAC via sessão.
    // (Também permite roles não-admin com a permissão audit.run)
    return withPermission(req, "audit.run", async (user, ctx) => {
      requestedBy = { userId: user.id, email: user.email ?? user.id };
      organizationId = ctx.organizationId;
      return handleRun(req, requestedBy, organizationId);
    });
  }

  // Para automação via token, opcionalmente pode informar o tenant pelo header.
  // (Se não vier, o run fica com organization_id NULL e não aparece na UI por tenant.)
  const orgHeader = req.headers.get("x-organization-id");
  const parsedOrg = orgHeader ? Number(orgHeader) : NaN;
  organizationId = Number.isFinite(parsedOrg) ? parsedOrg : null;

  return handleRun(req, requestedBy, organizationId);
}

async function handleRun(
  req: Request,
  requestedBy: { userId: string; email: string },
  organizationId: number | null
) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Defaults: 36 meses (inclui mês atual e os 35 anteriores)
  const today = todayUtcDate();
  const defaultStart = startOfMonthUtc(addMonthsUtc(today, -35));
  const defaultEnd = today;

  const periodStart = parsed.data.periodStart
    ? new Date(`${parsed.data.periodStart}T00:00:00Z`)
    : defaultStart;
  const periodEndInclusive = parsed.data.periodEnd
    ? new Date(`${parsed.data.periodEnd}T00:00:00Z`)
    : defaultEnd;

  if (isNaN(periodStart.getTime())) {
    return NextResponse.json({ error: "periodStart inválido" }, { status: 400 });
  }
  if (isNaN(periodEndInclusive.getTime())) {
    return NextResponse.json({ error: "periodEnd inválido" }, { status: 400 });
  }
  if (periodStart.getTime() > periodEndInclusive.getTime()) {
    return NextResponse.json({ error: "periodStart > periodEnd" }, { status: 400 });
  }

  const axis = parsed.data.axis ?? "VENCIMENTO";
  if (axis !== "VENCIMENTO") {
    return NextResponse.json(
      { error: "Axis ainda não suportado neste build", supported: ["VENCIMENTO"] },
      { status: 400 }
    );
  }

  try {
    // Evita 504 no proxy: por padrão roda em background.
    // Para modo síncrono (debug), envie header: x-audit-wait: 1
    const wait = req.headers.get("x-audit-wait") === "1";
    const fn = wait ? runSnapshot : queueSnapshot;

    const { runId } = await fn({ periodStart, periodEndInclusive, axis, requestedBy, organizationId });

    return NextResponse.json({
      success: true,
      runId,
      queued: !wait,
      period: {
        start: periodStart.toISOString().slice(0, 10),
        end: periodEndInclusive.toISOString().slice(0, 10),
      },
      axis,
    });
  } catch (err) {
    const isProd = process.env.NODE_ENV === "production";
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao executar snapshot",
        ...(isProd && !debugRequested ? {} : { debug: { message } }),
      },
      { status: 500 }
    );
  }
}
