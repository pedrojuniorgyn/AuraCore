import { NextResponse } from "next/server";
import { scheduleAutoSmokeRun } from "@/lib/ops/auto-smoke";

/**
 * Healthcheck simples (não toca no banco)
 * Usado pelo Coolify/Traefik para detectar serviço "healthy".
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Pós-deploy: dispara smoke test em background (não bloqueia o healthcheck).
  scheduleAutoSmokeRun("healthcheck");
  return NextResponse.json(
    {
      ok: true,
      service: "auracore-web",
      ts: new Date().toISOString(),
    },
    { status: 200 }
  );
}


