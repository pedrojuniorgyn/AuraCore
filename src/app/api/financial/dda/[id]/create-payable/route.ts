/**
 * API: Criar Conta a Pagar a partir de DDA
 * POST /api/financial/dda/[id]/create-payable
 * 
 * E8 Fase 1.3: Migrado para usar factory DDD
 */

import { NextRequest, NextResponse } from "next/server";
import { createDdaSyncService } from "@/modules/financial/infrastructure/services/DdaSyncService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao criar conta a pagar:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao criar conta a pagar" },
      { status: 500 }
    );
  }
}


















