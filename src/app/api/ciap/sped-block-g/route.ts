/**
 * POST /api/ciap/sped-block-g
 * Gera Bloco G do SPED para controle de créditos de ICMS sobre ativos
 * 
 * @since E9 Fase 2 - Migrado para ICiapEngineGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { INTEGRATIONS_TOKENS } from "@/modules/integrations/infrastructure/di/IntegrationsModule";
import type { ICiapEngineGateway } from "@/modules/integrations/domain/ports/output/ICiapEngineGateway";
import { Result } from "@/shared/domain";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { period } = body;

    // Resolver gateway via DI
    const ciapEngine = container.resolve<ICiapEngineGateway>(
      INTEGRATIONS_TOKENS.CiapEngineGateway
    );

    const result = await ciapEngine.generateSpedBlockG({
      organizationId: session.user.organizationId,
      branchId: session.user.defaultBranchId || 1,
      period,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lines: result.value.lines,
      message: `Bloco G gerado com ${result.value.lines.length} linhas`
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
