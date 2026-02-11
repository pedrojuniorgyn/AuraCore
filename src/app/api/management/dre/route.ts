/**
 * API: DRE Gerencial
 * GET /api/management/dre
 * 
 * @since E9 Fase 1 - Migrado para IManagementAccountingGateway via DI
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { ACCOUNTING_TOKENS } from "@/modules/accounting/infrastructure/di/AccountingModule";
import type { IManagementAccountingGateway } from "@/modules/accounting/domain/ports/output/IManagementAccountingGateway";
import { Result } from "@/shared/domain";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * GET /api/management/dre?period=2024-12&branchId=1&serviceType=FTL
 * Calcula DRE Gerencial
 */
export const GET = withDI(async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const branchId = searchParams.get("branchId");
    const serviceType = searchParams.get("serviceType");

    const organizationId = BigInt(session.user.organizationId);

    // Resolver gateway via DI
    const managementAccounting = container.resolve<IManagementAccountingGateway>(
      ACCOUNTING_TOKENS.ManagementAccountingGateway
    );

    const result = await managementAccounting.calculateDRE({
      period,
      organizationId,
      branchId: branchId ? parseInt(branchId) : undefined,
      serviceType: serviceType || undefined,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.value,
      metadata: {
        period,
        branchId,
        serviceType,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao calcular DRE Gerencial:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
