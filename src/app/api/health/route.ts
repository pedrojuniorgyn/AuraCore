import { NextResponse } from "next/server";

/**
 * Healthcheck simples (não toca no banco)
 * Usado pelo Coolify/Traefik para detectar serviço "healthy".
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "auracore-web",
      ts: new Date().toISOString(),
    },
    { status: 200 }
  );
}

