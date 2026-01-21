/**
 * API Route para chat com agentes.
 *
 * POST /api/agents/chat
 * 
 * @since E8 Fase 4 - Migrado para IAgentsGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { 
  IAgentsGateway,
  AgentContext,
  ChatRequest,
} from "@/modules/integrations/domain/ports/output/IAgentsGateway";
import { Result } from "@/shared/domain";

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
      sessionId: globalThis.crypto.randomUUID(),
      roles: user.role ? [user.role] : ["user"],
      permissions: [],
    };

    // 4. Resolver gateway e chamar
    const agentsGateway = container.resolve<IAgentsGateway>(TOKENS.AgentsGateway);
    const result = await agentsGateway.chat(chatRequest, context);

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 503 }
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro no chat:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
