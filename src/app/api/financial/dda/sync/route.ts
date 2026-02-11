/**
 * API: Sincronizar DDA (Buscar boletos do banco)
 * POST /api/financial/dda/sync
 * 
 * E8 Fase 1.3: Migrado para usar factory DDD
 */

import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { createDdaSyncService } from "@/modules/financial/infrastructure/services/DdaSyncService";
import { getTenantContext } from "@/lib/auth/context";
import { acquireIdempotency, finalizeIdempotency } from "@/lib/idempotency/sql-idempotency";

import { logger } from '@/shared/infrastructure/logging';
export const runtime = "nodejs";

function isInternalTokenOk(req: NextRequest) {
  const auditToken = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerAuditToken = req.headers.get("x-audit-token");
  if (auditToken && headerAuditToken && headerAuditToken === auditToken) return true;

  const diagToken = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerDiagToken =
    req.headers.get("x-internal-token") || req.headers.get("x-diagnostics-token");
  if (diagToken && headerDiagToken && headerDiagToken === diagToken) return true;

  return false;
}

export const POST = withDI(async (request: NextRequest) => {
  try {
    const tokenOk = isInternalTokenOk(request);
    const ctx = tokenOk
      ? {
          userId: "SYSTEM",
          organizationId: Number(request.headers.get("x-organization-id")),
          role: "ADMIN",
          defaultBranchId: null,
          allowedBranches: [],
          isAdmin: true,
        }
      : await getTenantContext();

    if (tokenOk && (!Number.isFinite(ctx.organizationId) || ctx.organizationId <= 0)) {
      return NextResponse.json(
        { error: "Informe x-organization-id (modo token)" },
        { status: 400 }
      );
    }
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
      const ref = (idem.resultRef ?? "").toString();
      const importedMatch = ref.startsWith("imported:") ? Number(ref.replace("imported:", "")) : NaN;
      const imported = Number.isFinite(importedMatch) ? importedMatch : null;
      return NextResponse.json({
        success: true,
        idempotency: "hit",
        imported,
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
    // E8 Fase 1.3: Usando factory DDD
    // Segurança: organizationId vem da sessão (tenant context), nunca do body.
    const ddaService = createDdaSyncService(ctx.organizationId, bankAccountId);
    try {
      const imported = await ddaService.syncDdaInbox();

      // Idempotência: best-effort (não derruba sucesso da operação se a finalização falhar).
      try {
        await finalizeIdempotency({
          organizationId: ctx.organizationId,
          scope,
          key: idemKey,
          status: "SUCCEEDED",
          resultRef: `imported:${imported}`,
        });
      } catch (e: unknown) {
        logger.error("⚠️ Falha ao finalizar idempotência (SUCCEEDED):", e);
      }

      return NextResponse.json({
        success: true,
        imported,
        message: `${imported} boleto(s) importado(s) com sucesso`,
      });
    } catch (e: unknown) {
      // Idempotência: best-effort (não mascarar erro original se a finalização falhar).
      try {
        await finalizeIdempotency({
          organizationId: ctx.organizationId,
          scope,
          key: idemKey,
          status: "FAILED",
          errorMessage: e instanceof Error ? e.message : String(e),
        });
      } catch (e2: unknown) {
        logger.error("⚠️ Falha ao finalizar idempotência (FAILED):", e2);
      }
      throw e;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // getTenantContext() pode lançar NextResponse (401/500). Preserve.
    if (error instanceof Response) return error;
    logger.error("❌ Erro ao sincronizar DDA:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao sincronizar DDA" },
      { status: 500 }
    );
  }
});

















