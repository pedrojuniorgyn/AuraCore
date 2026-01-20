/**
 * API: Vincular DDA a uma Conta a Pagar existente
 * POST /api/financial/dda/[id]/link
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao vincular DDA:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao vincular DDA" },
      { status: 500 }
    );
  }
}


















