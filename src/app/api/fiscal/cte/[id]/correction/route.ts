import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader, cteCorrectionLetters } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

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
      await db.insert(cteCorrectionLetters).values({
        organizationId: ctx.organizationId,
        cteHeaderId: cteId,
        sequenceNumber,
        corrections: JSON.stringify(corrections),
        status: "PENDING", // TODO: Enviar para Sefaz
        createdBy: ctx.userId,
      } as any);

      const [created] = await db
        .select({ id: cteCorrectionLetters.id })
        .from(cteCorrectionLetters)
        .where(
          and(
            eq(cteCorrectionLetters.organizationId, ctx.organizationId),
            eq(cteCorrectionLetters.cteHeaderId, cteId),
            eq(cteCorrectionLetters.sequenceNumber, sequenceNumber)
          )
        )
        .orderBy(desc(cteCorrectionLetters.id));

      const cceId = created?.id;
      if (!cceId) {
        return NextResponse.json(
          { error: "Falha ao registrar CCe (registro não encontrado após insert)" },
          { status: 500 }
        );
      }

      // TODO: Implementar envio real para Sefaz
      console.log("⚠️  CCe registrada localmente. Envio para Sefaz pendente de implementação.");

      return NextResponse.json({
        success: true,
        message: "Carta de Correção registrada (envio para Sefaz pendente)",
        data: { cceId, sequenceNumber },
      });
    } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Response) {
        return error;
      }
      console.error("❌ Erro ao processar CCe:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  });
}















