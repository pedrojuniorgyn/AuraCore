/**
 * API: Emitir NFS-e para pré-fatura WMS
 * POST /api/wms/pre-invoices/:id/issue-nfse
 * 
 * @since E9 Fase 2 - Migrado para IWmsBillingGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { WMS_TOKENS } from "@/modules/wms/infrastructure/di/WmsModule";
import type { IWmsBillingGateway } from "@/modules/wms/domain/ports/output/IWmsBillingGateway";
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
    const preInvoiceId = parseInt(resolvedParams.id);
    const invoiceNumber = `NFS-${Date.now().toString().slice(-8)}`;

    // Resolver gateway via DI
    const wmsBilling = container.resolve<IWmsBillingGateway>(WMS_TOKENS.BillingGateway);

    const result = await wmsBilling.issueNfse({
      preInvoiceId,
      invoiceNumber,
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
      message: "NFS-e emitida com sucesso",
      invoiceNumber
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
