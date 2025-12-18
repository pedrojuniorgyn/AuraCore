import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { runSnapshot } from "@/lib/audit/etl/snapshotRun";

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

export async function POST(req: Request) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";

  // Autorização: token (preferencial para automação) OU sessão admin (fallback)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  let requestedBy = { userId: "system", email: "system" };

  if (token) {
    if (!headerToken || headerToken !== token) {
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        {
          error: "Não autorizado",
          ...(isProd || !debugRequested
            ? {}
            : {
                debug: {
                  tokenConfigured: true,
                  headerTokenPresent: Boolean(headerToken),
                  headerTokenLength: headerToken ? headerToken.length : 0,
                },
              }),
        },
        { status: 401 }
      );
    }
  } else {
    const session = await auth();
    if (!session?.user) {
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        {
          error: "Não autorizado",
          ...(isProd || !debugRequested
            ? {}
            : {
                debug: {
                  tokenConfigured: false,
                },
              }),
        },
        { status: 401 }
      );
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    requestedBy = { userId: session.user.id, email: session.user.email ?? session.user.id };
  }

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
    const { runId } = await runSnapshot({
      periodStart,
      periodEndInclusive,
      axis,
      requestedBy,
    });

    return NextResponse.json({
      success: true,
      runId,
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
