/**
 * API: Criar Conta a Pagar a partir de DDA
 * POST /api/financial/dda/[id]/create-payable
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
    const { organizationId, bankAccountId } = body;

    // === CRIAR CONTA A PAGAR ===
    // E8 Fase 1.3: Usando factory DDD
    const ddaService = createDdaSyncService(organizationId, bankAccountId);
    const payableId = await ddaService.createPayableFromDda(Number(id));

    return NextResponse.json({
      success: true,
      payableId,
      message: "Conta a pagar criada com sucesso",
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao criar conta a pagar:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao criar conta a pagar" },
      { status: 500 }
    );
  }
});


















