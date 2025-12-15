/**
 * API: Sincronizar DDA (Buscar boletos do banco)
 * POST /api/financial/dda/sync
 */

import { NextRequest, NextResponse } from "next/server";
import { BtgDdaService } from "@/services/banking/btg-dda-service";
import { getTenantContext } from "@/lib/auth/context";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: "Apenas ADMIN pode executar sincronização DDA" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bankAccountId } = body as { bankAccountId?: number };

    if (!bankAccountId) {
      return NextResponse.json(
        { error: "Informe a conta bancária" },
        { status: 400 }
      );
    }

    // === EXECUTAR SINCRONIZAÇÃO ===
    // Segurança: organizationId vem da sessão (tenant context), nunca do body.
    const ddaService = new BtgDdaService(ctx.organizationId, bankAccountId);
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

















