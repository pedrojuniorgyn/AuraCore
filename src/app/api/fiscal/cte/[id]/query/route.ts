import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cteAuthorizationService } from "@/services/fiscal/cte-authorization-service";

/**
 * GET /api/fiscal/cte/:id/query
 * Consulta status de um CTe na Sefaz
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user, ctx) => {
    const cteId = parseInt(resolvedParams.id);

    if (isNaN(cteId)) {
      return NextResponse.json(
        { error: "ID de CTe inválido" },
        { status: 400 }
      );
    }

    // Buscar CTe
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
        { error: "CTe sem chave de acesso" },
        { status: 400 }
      );
    }

    try {
    const resolvedParams = await params;
      // Extrair UF da chave
      const uf = cte.cteKey.substring(0, 2);

      const resultado = await cteAuthorizationService.consultarCTe(cte.cteKey, uf);

      return NextResponse.json({
        success: true,
        data: {
          cteId,
          chave: cte.cteKey,
          statusSefaz: resultado.status,
          motivo: resultado.motivo,
          statusLocal: cte.status,
        },
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}
















