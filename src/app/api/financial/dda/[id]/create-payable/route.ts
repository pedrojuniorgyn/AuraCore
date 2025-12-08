/**
 * API: Criar Conta a Pagar a partir de DDA
 * POST /api/financial/dda/[id]/create-payable
 */

import { NextRequest, NextResponse } from "next/server";
import { BtgDdaService } from "@/services/banking/btg-dda-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { organizationId, bankAccountId } = body;

    // === CRIAR CONTA A PAGAR ===
    const ddaService = new BtgDdaService(organizationId, bankAccountId);
    const payableId = await ddaService.createPayableFromDda(Number(id));

    return NextResponse.json({
      success: true,
      payableId,
      message: "Conta a pagar criada com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar conta a pagar:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao criar conta a pagar" },
      { status: 500 }
    );
  }
}


