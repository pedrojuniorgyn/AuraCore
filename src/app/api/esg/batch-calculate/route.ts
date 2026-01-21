/**
 * POST /api/esg/batch-calculate
 * Calcula emissões de carbono em lote
 * 
 * @since E9 Fase 2 - Migrado para IEsgCalculatorGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { INTEGRATIONS_TOKENS } from "@/modules/integrations/infrastructure/di/IntegrationsModule";
import type { IEsgCalculatorGateway } from "@/modules/integrations/domain/ports/output/IEsgCalculatorGateway";
import { Result } from "@/shared/domain";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    // Resolver gateway via DI
    const esgCalculator = container.resolve<IEsgCalculatorGateway>(
      INTEGRATIONS_TOKENS.EsgCalculatorGateway
    );

    const result = await esgCalculator.batchCalculate({
      organizationId: session.user.organizationId,
      branchId: session.user.defaultBranchId || 1,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    if (Result.isFail(result)) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...result.value
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
}
