/**
 * API Route para verificar health dos agentes.
 *
 * GET /api/agents/health
 */

import { NextResponse } from "next/server";
import { getAgentsService } from "@/services/agents/agentsService";

export async function GET() {
  try {
    const agentsService = getAgentsService();
    const health = await agentsService.checkHealth();

    const statusCode = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch {
    return NextResponse.json(
      { status: "unhealthy", error: "Agentes não disponíveis" },
      { status: 503 }
    );
  }
}
