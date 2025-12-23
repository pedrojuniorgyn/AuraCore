/**
 * API: Sincronizar DDA (Buscar boletos do banco)
 * POST /api/financial/dda/sync
 */

import { NextRequest, NextResponse } from "next/server";
import { BtgDdaService } from "@/services/banking/btg-dda-service";
import { getTenantContext } from "@/lib/auth/context";
import { acquireIdempotency, finalizeIdempotency } from "@/lib/idempotency/sql-idempotency";

export const runtime = "nodejs";

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

    const scope = "financial.dda.sync";
    const keyFromHeader =
      request.headers.get("idempotency-key") ||
      request.headers.get("Idempotency-Key");
    const defaultKey = `dda_sync:${ctx.organizationId}:${bankAccountId}:${new Date().toISOString().slice(0, 13)}`.slice(
      0,
      128
    );
    const idemKey = (keyFromHeader && keyFromHeader.trim()) ? keyFromHeader.trim().slice(0, 128) : defaultKey;

    const idem = await acquireIdempotency({
      organizationId: ctx.organizationId,
      scope,
      key: idemKey,
      ttlMinutes: 60, // evita duplo sync na mesma hora; admin pode forçar com outra key
    });
    if (idem.outcome === "hit") {
      return NextResponse.json({
        success: true,
        idempotency: "hit",
        imported: 0,
        message: "Sincronização já executada recentemente (efeito único)",
      });
    }
    if (idem.outcome === "in_progress") {
      return NextResponse.json(
        { success: true, idempotency: "in_progress", message: "Sincronização já está em processamento" },
        { status: 202 }
      );
    }

    // === EXECUTAR SINCRONIZAÇÃO ===
    // Segurança: organizationId vem da sessão (tenant context), nunca do body.
    const ddaService = new BtgDdaService(ctx.organizationId, bankAccountId);
    try {
      const imported = await ddaService.syncDdaInbox();

      await finalizeIdempotency({
        organizationId: ctx.organizationId,
        scope,
        key: idemKey,
        status: "SUCCEEDED",
        resultRef: `imported:${imported}`,
      });

      return NextResponse.json({
        success: true,
        imported,
        message: `${imported} boleto(s) importado(s) com sucesso`,
      });
    } catch (e: any) {
      await finalizeIdempotency({
        organizationId: ctx.organizationId,
        scope,
        key: idemKey,
        status: "FAILED",
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  } catch (error: any) {
    console.error("❌ Erro ao sincronizar DDA:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao sincronizar DDA" },
      { status: 500 }
    );
  }
}

















