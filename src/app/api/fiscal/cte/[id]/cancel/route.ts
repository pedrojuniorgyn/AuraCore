import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader, fiscalSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { ISefazGateway } from "@/modules/integrations/domain/ports/output/ISefazGateway";
import { Result } from "@/shared/domain";

/**
 * POST /api/fiscal/cte/:id/cancel
 * 🔐 Requer permissão: fiscal.cte.cancel
 * 
 * Cancela um CTe na Sefaz
 * 
 * @since E8 Fase 2.4 - Migrado para DI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "fiscal.cte.cancel", async (user, ctx) => {
    const resolvedParams = await params;
    const cteId = parseInt(resolvedParams.id);

    if (isNaN(cteId)) {
      return NextResponse.json(
        { error: "ID de CTe inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { justificativa } = body;

    if (!justificativa) {
      return NextResponse.json(
        { error: "Justificativa é obrigatória" },
        { status: 400 }
      );
    }

    if (justificativa.length < 15) {
      return NextResponse.json(
        { error: "Justificativa deve ter no mínimo 15 caracteres" },
        { status: 400 }
      );
    }

    try {
      // 1. Buscar CTe
      const [cte] = await db
        .select()
        .from(cteHeader)
        .where(eq(cteHeader.id, cteId));

      if (!cte) {
        return NextResponse.json(
          { error: "CTe não encontrado" },
          { status: 404 }
        );
      }

      if (!cte.cteKey) {
        return NextResponse.json(
          { error: "CTe sem chave de acesso, não pode ser cancelado" },
          { status: 400 }
        );
      }

      if (!cte.protocolNumber) {
        return NextResponse.json(
          { error: "CTe sem protocolo de autorização, não pode ser cancelado" },
          { status: 400 }
        );
      }

      if (cte.status === "CANCELLED") {
        return NextResponse.json(
          { error: "CTe já está cancelado" },
          { status: 400 }
        );
      }

      // 2. Buscar ambiente
      const [settings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, ctx.organizationId),
            eq(fiscalSettings.branchId, ctx.branchId ?? 0)
          )
        );

      const environment = settings?.cteEnvironment === "production" ? "production" : "homologation";

      // 3. Cancelar via ISefazGateway (DI)
      const sefazGateway = container.resolve<ISefazGateway>(TOKENS.SefazGateway);
      
      const cancelResult = await sefazGateway.cancelCte({
        cteKey: cte.cteKey,
        protocolNumber: cte.protocolNumber,
        justification: justificativa,
        environment,
      });

      if (Result.isFail(cancelResult)) {
        return NextResponse.json(
          {
            success: false,
            error: "Falha ao cancelar CTe",
            motivo: cancelResult.error,
          },
          { status: 422 }
        );
      }

      const resultado = cancelResult.value;

      // 4. Atualizar status no banco
      await db
        .update(cteHeader)
        .set({
          status: "CANCELLED",
          updatedAt: new Date(),
        })
        .where(eq(cteHeader.id, cteId));

      return NextResponse.json({
        success: true,
        message: "CTe cancelado com sucesso na Sefaz!",
        data: {
          cteId,
          status: resultado.status,
          protocolNumber: resultado.protocolNumber,
          cancellationDate: resultado.cancellationDate,
          motivo: resultado.message,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao cancelar CTe:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}
