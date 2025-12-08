/**
 * API: Sincronizar DDA (Buscar boletos do banco)
 * POST /api/financial/dda/sync
 */

import { NextRequest, NextResponse } from "next/server";
import { BtgDdaService } from "@/services/banking/btg-dda-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, bankAccountId } = body;

    if (!organizationId || !bankAccountId) {
      return NextResponse.json(
        { error: "Informe a organização e conta bancária" },
        { status: 400 }
      );
    }

    // === EXECUTAR SINCRONIZAÇÃO ===
    const ddaService = new BtgDdaService(organizationId, bankAccountId);
    const imported = await ddaService.syncDdaInbox();

    return NextResponse.json({
      success: true,
      imported,
      message: `${imported} boleto(s) importado(s) com sucesso`,
    });
  } catch (error: any) {
    console.error("❌ Erro ao sincronizar DDA:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao sincronizar DDA" },
      { status: 500 }
    );
  }
}


