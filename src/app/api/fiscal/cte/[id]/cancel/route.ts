import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { cteAuthorizationService } from "@/services/fiscal/cte-authorization-service";

/**
 * POST /api/fiscal/cte/:id/cancel
 * 🔐 Requer permissão: fiscal.cte.cancel
 * 
 * Cancela um CTe na Sefaz
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "fiscal.cte.cancel", async (user, ctx) => {
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
    const resolvedParams = await params;
      const resultado = await cteAuthorizationService.cancelarCTe(
        cteId,
        justificativa,
        ctx.organizationId
      );

      if (resultado.success) {
        return NextResponse.json({
          success: true,
          message: "CTe cancelado com sucesso na Sefaz!",
          data: {
            cteId,
            status: resultado.status,
            motivo: resultado.motivo,
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Falha ao cancelar CTe",
            motivo: resultado.motivo,
          },
          { status: 422 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}














