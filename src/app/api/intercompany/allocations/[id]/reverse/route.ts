/**
 * POST /api/intercompany/allocations/:id/reverse
 * Estorna rateio intercompany
 * 
 * @since E9 Fase 2 - Migrado para IIntercompanyGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { INTEGRATIONS_TOKENS } from "@/modules/integrations/infrastructure/di/IntegrationsModule";
import type { IIntercompanyGateway } from "@/modules/integrations/domain/ports/output/IIntercompanyGateway";
import { Result } from "@/shared/domain";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;

    // Resolver gateway via DI
    const intercompany = container.resolve<IIntercompanyGateway>(
      INTEGRATIONS_TOKENS.IntercompanyGateway
    );

    const result = await intercompany.reverseAllocation({
      allocationId: parseInt(resolvedParams.id),
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
      message: "Rateio estornado com sucesso"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
