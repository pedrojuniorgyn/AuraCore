/**
 * API Route para chat com streaming (SSE).
 *
 * POST /api/agents/chat/stream
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getAgentsService } from "@/services/agents/agentsService";
import type { AgentContext, ChatRequest } from "@/types/agents";

export async function POST(request: NextRequest) {
  // 1. Autenticação
  const session = await auth();
  if (!session?.user) {
    return new Response("Não autorizado", { status: 401 });
  }

  // 2. Parse do body
  const body = await request.json();
  const chatRequest: ChatRequest = {
    message: body.message,
    conversationId: body.conversationId,
    agentHint: body.agentHint,
  };

  if (!chatRequest.message?.trim()) {
    return new Response("Mensagem é obrigatória", { status: 400 });
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

  // 4. Criar stream
  const encoder = new TextEncoder();
  const agentsService = getAgentsService();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of agentsService.chatStream(
          chatRequest,
          context
        )) {
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(
          encoder.encode(`data: {"type":"error","error":"Erro no stream"}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
