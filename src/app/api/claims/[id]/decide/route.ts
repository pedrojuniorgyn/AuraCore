/**
 * POST /api/claims/:id/decide
 * Registra decisão em reclamação/sinistro
 * 
 * @since E9 Fase 2 - Migrado para IClaimsEngineGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { INTEGRATIONS_TOKENS } from "@/modules/integrations/infrastructure/di/IntegrationsModule";
import type { IClaimsEngineGateway } from "@/modules/integrations/domain/ports/output/IClaimsEngineGateway";
import { Result } from "@/shared/domain";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';

export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const body = await request.json();
    const { decision, amount, notes } = body;

    // Resolver gateway via DI
    const claimsEngine = container.resolve<IClaimsEngineGateway>(
      INTEGRATIONS_TOKENS.ClaimsEngineGateway
    );

    const result = await claimsEngine.decide({
      claimId: parseInt(resolvedParams.id),
      decision,
      amount,
      notes,
      organizationId: session.user.organizationId,
      branchId: session.user.defaultBranchId || 1,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Decisão registrada: ${decision}`
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});
