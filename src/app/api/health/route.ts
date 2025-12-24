import { NextResponse } from "next/server";

/**
 * Healthcheck simples (não toca no banco)
 * Usado pelo Coolify/Traefik para detectar serviço "healthy".
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // IMPORTANTE:
  // - /api/health precisa responder rápido e nunca depender de DB/imports pesados.
  // - o auto-smoke é disparado em background (best-effort) via import dinâmico.
  try {
    void import("@/lib/ops/auto-smoke")
      .then(({ scheduleAutoSmokeRun }) => {
        try {
          scheduleAutoSmokeRun("healthcheck");
        } catch (e) {
          console.error("⚠️ auto-smoke failed (schedule):", e);
        }
      })
      .catch((e) => {
        console.error("⚠️ auto-smoke failed (import):", e);
      });
  } catch (e) {
    console.error("⚠️ auto-smoke failed (sync):", e);
  }
  return NextResponse.json(
    {
      ok: true,
      service: "auracore-web",
      ts: new Date().toISOString(),
    },
    { status: 200 }
  );
}


