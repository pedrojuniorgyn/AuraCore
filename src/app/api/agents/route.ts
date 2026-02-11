/**
 * API Route para listar agentes disponíveis.
 *
 * GET /api/agents
 * 
 * @since E8 Fase 4 - Migrado para IAgentsGateway via DI
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IAgentsGateway } from "@/modules/integrations/domain/ports/output/IAgentsGateway";
import { Result } from "@/shared/domain";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async () => {
  try {
    // 1. Autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Resolver gateway via DI
    const agentsGateway = container.resolve<IAgentsGateway>(TOKENS.AgentsGateway);
    
    // 3. Listar agentes
    const result = await agentsGateway.listAgents();

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
    logger.error("Erro ao listar agentes:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
});
