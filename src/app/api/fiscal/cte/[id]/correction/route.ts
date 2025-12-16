import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader, cteCorrectionLetters } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * POST /api/fiscal/cte/:id/correction
 * 🔐 Requer permissão: fiscal.cte.create
 * 
 * Envia Carta de Correção (CCe) para CTe
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "fiscal.cte.create", async (user, ctx) => {
    try {
      const { ensureConnection } = await import("@/lib/db");
      await ensureConnection();

      const resolvedParams = await params;
      const cteId = parseInt(resolvedParams.id);

      if (isNaN(cteId)) {
        return NextResponse.json(
          { error: "ID de CTe inválido" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { corrections } = body;

      if (!corrections || corrections.length === 0) {
        return NextResponse.json(
          { error: "Informe as correções" },
          { status: 400 }
        );
      }

      // Buscar CTe
      const [cte] = await db
        .select()
        .from(cteHeader)
        .where(and(eq(cteHeader.id, cteId), eq(cteHeader.organizationId, ctx.organizationId)));

      if (!cte) {
        return NextResponse.json(
          { error: "CTe não encontrado" },
          { status: 404 }
        );
      }

      if (cte.status !== "AUTHORIZED") {
        return NextResponse.json(
          { error: "Apenas CTes autorizados podem ser corrigidos" },
          { status: 400 }
        );
      }

      // Contar CCe existentes
      const existingCCe = await db
        .select()
        .from(cteCorrectionLetters)
        .where(
          and(
            eq(cteCorrectionLetters.cteHeaderId, cteId),
            eq(cteCorrectionLetters.organizationId, ctx.organizationId)
          )
        );

      const sequenceNumber = existingCCe.length + 1;

      // Registrar CCe (implementação simplificada)
      const [createdId] = await db
        .insert(cteCorrectionLetters)
        .values({
          organizationId: ctx.organizationId,
          cteHeaderId: cteId,
          sequenceNumber,
          corrections: JSON.stringify(corrections),
          status: "PENDING", // TODO: Enviar para Sefaz
          createdBy: ctx.user.id,
        })
        .$returningId();

      const cceId = (createdId as any)?.id;

      // TODO: Implementar envio real para Sefaz
      console.log("⚠️  CCe registrada localmente. Envio para Sefaz pendente de implementação.");

      return NextResponse.json({
        success: true,
        message: "Carta de Correção registrada (envio para Sefaz pendente)",
        data: { cceId, sequenceNumber },
      });
    } catch (error: any) {
      console.error("❌ Erro ao processar CCe:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}
















