/**
 * API Route para listar agentes disponíveis.
 *
 * GET /api/agents
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAgentsService } from "@/services/agents/agentsService";

export async function GET() {
  try {
    // 1. Autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Listar agentes
    const agentsService = getAgentsService();
    const agents = await agentsService.listAgents();

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Erro ao listar agentes:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
