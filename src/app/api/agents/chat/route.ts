/**
 * API Route para chat com agentes.
 *
 * POST /api/agents/chat
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAgentsService } from "@/services/agents/agentsService";
import type { AgentContext, ChatRequest } from "@/types/agents";

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Parse do body
    const body = await request.json();
    const chatRequest: ChatRequest = {
      message: body.message,
      conversationId: body.conversationId,
      agentHint: body.agentHint,
    };

    if (!chatRequest.message?.trim()) {
      return NextResponse.json(
        { error: "Mensagem é obrigatória" },
        { status: 400 }
      );
    }

    // 3. Construir contexto
    const user = session.user;

    const context: AgentContext = {
      userId: user.id,
      organizationId: user.organizationId,
      branchId: user.defaultBranchId || user.organizationId,
      sessionId: crypto.randomUUID(),
      roles: user.role ? [user.role] : ["user"],
      permissions: [],
    };

    // 4. Chamar serviço
    const agentsService = getAgentsService();
    const response = await agentsService.chat(chatRequest, context);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro no chat:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
