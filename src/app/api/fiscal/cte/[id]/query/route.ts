import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader, fiscalSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { ISefazGateway } from "@/modules/integrations/domain/ports/output/ISefazGateway";
import { Result } from "@/shared/domain";

/**
 * GET /api/fiscal/cte/:id/query
 * Consulta status de um CTe na Sefaz
 * 
 * @since E8 Fase 2.4 - Migrado para DI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user, ctx) => {
    const resolvedParams = await params;
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

    if (!cte.cteKey) {
      return NextResponse.json(
        { error: "CTe sem chave de acesso" },
        { status: 400 }
      );
    }

    try {
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

      // 3. Consultar via ISefazGateway (DI)
      const sefazGateway = container.resolve<ISefazGateway>(TOKENS.SefazGateway);
      
      const queryResult = await sefazGateway.queryCteStatus({
        cteKey: cte.cteKey,
        environment,
      });

      if (Result.isFail(queryResult)) {
        return NextResponse.json(
          { 
            success: false,
            error: queryResult.error 
          },
          { status: 500 }
        );
      }

      const resultado = queryResult.value;

      return NextResponse.json({
        success: true,
        data: {
          cteId,
          chave: cte.cteKey,
          statusSefaz: resultado.status,
          protocolNumber: resultado.protocolNumber,
          authorizationDate: resultado.authorizationDate,
          motivo: resultado.message,
          statusLocal: cte.status,
        },
      });
    } catch (error: unknown) {
      // Propagar erros de auth (getTenantContext throws Response)
      if (error instanceof Response) {
        return error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao consultar CTe:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}
