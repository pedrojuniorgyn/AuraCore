/**
 * API Route para verificar health dos agentes.
 *
 * GET /api/agents/health
 * 
 * @since E8 Fase 4 - Migrado para IAgentsGateway via DI
 */

import { NextResponse } from "next/server";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IAgentsGateway } from "@/modules/integrations/domain/ports/output/IAgentsGateway";
import { Result } from "@/shared/domain";

export async function GET() {
  try {
    // Resolver gateway via DI
    const agentsGateway = container.resolve<IAgentsGateway>(TOKENS.AgentsGateway);
    
    const result = await agentsGateway.checkHealth();

    if (Result.isFail(result)) {
      return NextResponse.json(
        { status: "unhealthy", error: result.error },
        { status: 503 }
      );
    }

    const health = result.value;
    const statusCode = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch {
    return NextResponse.json(
      { status: "unhealthy", error: "Agentes não disponíveis" },
      { status: 503 }
    );
  }
}
