import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { cteInutilizationService } from "@/services/fiscal/cte-inutilization-service";

/**
 * POST /api/fiscal/cte/inutilize
 * 🔐 Requer permissão: fiscal.cte.create
 * 
 * Inutiliza numeração de CTe na Sefaz
 */
export async function POST(request: NextRequest) {
  return withPermission(request, "fiscal.cte.create", async (user, ctx) => {
    try {
      const body = await request.json();
      const { serie, numberFrom, numberTo, year, justification } = body;

      // Validações
      if (!serie || !numberFrom || !numberTo || !year || !justification) {
        return NextResponse.json(
          { error: "Todos os campos são obrigatórios" },
          { status: 400 }
        );
      }

      if (justification.length < 15) {
        return NextResponse.json(
          { error: "Justificativa deve ter no mínimo 15 caracteres" },
          { status: 400 }
        );
      }

      if (numberFrom > numberTo) {
        return NextResponse.json(
          { error: "Número inicial deve ser menor que o final" },
          { status: 400 }
        );
      }

      // Validação de multi-tenancy
      if (!ctx.branchId) {
        return NextResponse.json(
          { error: "branchId é obrigatório para inutilização de CTe" },
          { status: 400 }
        );
      }

      // Inutilizar
      const resultado = await cteInutilizationService.inutilizar({
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        serie,
        numberFrom,
        numberTo,
        year,
        justification,
        userId: ctx.userId,
      });

      if (resultado.success) {
        return NextResponse.json({
          success: true,
          message: "Numeração inutilizada com sucesso!",
          data: {
            protocol: resultado.protocol,
            message: resultado.message,
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Falha ao inutilizar",
            message: resultado.message,
          },
          { status: 422 }
        );
      }
    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao inutilizar:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}
















