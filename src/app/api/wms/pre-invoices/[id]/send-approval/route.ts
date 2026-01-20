/**
 * API: Enviar pré-fatura WMS para aprovação
 * PUT /api/wms/pre-invoices/:id/send-approval
 * 
 * @since E9 Fase 2 - Migrado para IWmsBillingGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { WMS_TOKENS } from "@/modules/wms/infrastructure/di/WmsModule";
import type { IWmsBillingGateway } from "@/modules/wms/domain/ports/output/IWmsBillingGateway";
import { Result } from "@/shared/domain";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const preInvoiceId = parseInt(resolvedParams.id);

    // Resolver gateway via DI
    const wmsBilling = container.resolve<IWmsBillingGateway>(WMS_TOKENS.BillingGateway);

    const result = await wmsBilling.sendForApproval({
      preInvoiceId,
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
      message: "Pré-fatura enviada para aprovação do cliente"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
