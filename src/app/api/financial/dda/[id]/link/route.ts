/**
 * API: Vincular DDA a uma Conta a Pagar existente
 * POST /api/financial/dda/[id]/link
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
    const { organizationId, bankAccountId, payableId } = body;

    if (!payableId) {
      return NextResponse.json(
        { error: "Informe a conta a pagar" },
        { status: 400 }
      );
    }

    // === VINCULAR ===
    const ddaService = new BtgDdaService(organizationId, bankAccountId);
    await ddaService.linkDdaToPayable(Number(id), payableId);

    return NextResponse.json({
      success: true,
      message: "Boleto vinculado com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro ao vincular DDA:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao vincular DDA" },
      { status: 500 }
    );
  }
}













