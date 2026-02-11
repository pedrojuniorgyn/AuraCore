/**
 * API: Alocar Custos Indiretos
 * POST /api/management/allocate
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
 * POST /api/management/allocate
 * Aloca custos indiretos
 * 
 * Body: { period: "2024-12" }
 */
export const POST = withDI(async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { period } = body;

    if (!period) {
      return NextResponse.json(
        { error: "period é obrigatório (formato: YYYY-MM)" },
        { status: 400 }
      );
    }

    logger.info(`📊 Alocando custos indiretos para ${period}...`);

    const organizationId = BigInt(session.user.organizationId);

    // Resolver gateway via DI
    const managementAccounting = container.resolve<IManagementAccountingGateway>(
      ACCOUNTING_TOKENS.ManagementAccountingGateway
    );

    const result = await managementAccounting.allocateIndirectCosts({
      period,
      organizationId,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${result.value.allocated} alocações realizadas`,
      data: {
        allocatedCount: result.value.allocated,
        totalAmount: result.value.totalAmount,
        period,
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao alocar custos:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
