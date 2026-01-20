/**
 * API Route para chat com streaming (SSE).
 *
 * POST /api/agents/chat/stream
 * 
 * @since E8 Fase 4 - Migrado para IAgentsGateway via DI
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { 
  IAgentsGateway,
  AgentContext,
  ChatRequest,
} from "@/modules/integrations/domain/ports/output/IAgentsGateway";

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
    sessionId: globalThis.crypto.randomUUID(),
    roles: user.role ? [user.role] : ["user"],
    permissions: [],
  };

  // 4. Criar stream via Gateway DI
  const encoder = new TextEncoder();
  const agentsGateway = container.resolve<IAgentsGateway>(TOKENS.AgentsGateway);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of agentsGateway.chatStream(
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
