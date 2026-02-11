/**
 * API: Vincular DDA a uma Conta a Pagar existente
 * POST /api/financial/dda/[id]/link
 * 
 * E8 Fase 1.3: Migrado para usar factory DDD
 */

import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from "@/shared/infrastructure/di/with-di";
import { createDdaSyncService } from "@/modules/financial/infrastructure/services/DdaSyncService";

import { logger } from '@/shared/infrastructure/logging';
export const POST = withDI(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { organizationId, bankAccountId, payableId } = body;

    if (!payableId) {
      return NextResponse.json(
        { error: "Informe a conta a pagar" },
        { status: 400 }
      );
    }

    // === VINCULAR ===
    // E8 Fase 1.3: Usando factory DDD
    const ddaService = createDdaSyncService(organizationId, bankAccountId);
    await ddaService.linkDdaToPayable(Number(id), payableId);

    return NextResponse.json({
      success: true,
      message: "Boleto vinculado com sucesso",
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao vincular DDA:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao vincular DDA" },
      { status: 500 }
    );
  }
});


















