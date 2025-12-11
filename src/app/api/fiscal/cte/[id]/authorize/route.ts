import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cteAuthorizationService } from "@/services/fiscal/cte-authorization-service";
import { buildCteXml } from "@/services/fiscal/cte-builder";

/**
 * POST /api/fiscal/cte/:id/authorize
 * 🔐 Requer permissão: fiscal.cte.authorize
 * 
 * Autoriza um CTe na Sefaz
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "fiscal.cte.authorize", async (user, ctx) => {
    const cteId = parseInt(resolvedParams.id);

    if (isNaN(cteId)) {
      return NextResponse.json(
        { error: "ID de CTe inválido" },
        { status: 400 }
      );
    }

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

    // 2. Verificar se já está autorizado
    if (cte.status === "AUTHORIZED") {
      return NextResponse.json(
        {
          error: "CTe já está autorizado",
          chave: cte.cteKey,
          protocolo: cte.protocolNumber,
        },
        { status: 400 }
      );
    }

    // 3. Verificar se está cancelado
    if (cte.status === "CANCELLED") {
      return NextResponse.json(
        { error: "CTe está cancelado, não pode ser autorizado" },
        { status: 400 }
      );
    }

    try {
    const resolvedParams = await params;
      // 4. Gerar XML (se não existir)
      let xmlSemAssinatura = "";

      if (!cte.pickupOrderId) {
        return NextResponse.json(
          { error: "CTe sem ordem de coleta vinculada" },
          { status: 400 }
        );
      }

      console.log(`🔨 Gerando XML do CTe #${cteId}...`);
      xmlSemAssinatura = await buildCteXml({
        pickupOrderId: cte.pickupOrderId,
        organizationId: ctx.organizationId,
      });

      // 5. Autorizar na Sefaz
      console.log(`🚀 Autorizando CTe #${cteId} na Sefaz...`);
      const resultado = await cteAuthorizationService.autorizarCTe(
        cteId,
        xmlSemAssinatura,
        ctx.organizationId,
        ctx.branchId
      );

      if (resultado.success) {
        return NextResponse.json({
          success: true,
          message: "CTe autorizado com sucesso na Sefaz!",
          data: {
            cteId,
            chave: resultado.chaveAcesso,
            protocolo: resultado.numeroProtocolo,
            dataAutorizacao: resultado.dataAutorizacao,
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "CTe rejeitado pela Sefaz",
            motivo: resultado.motivo,
            rejeicoes: resultado.rejeicoes,
          },
          { status: 422 } // Unprocessable Entity
        );
      }
    } catch (error: any) {
      console.error("❌ Erro ao autorizar CTe:", error);
      return NextResponse.json(
        {
          error: "Erro ao autorizar CTe",
          details: error.message,
        },
        { status: 500 }
      );
    }
  });
}









