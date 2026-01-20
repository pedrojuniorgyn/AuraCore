import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

// Legacy: buildCteXml ainda busca dados do banco e monta XML
// TODO (E8 Fase 3): Criar CreateCteUseCase que orquestre busca + CteBuilderService
import { buildCteXml } from "@/services/fiscal/cte-builder";
import { validatePickupOrderInsurance } from "@/services/validators/insurance-validator";

/**
 * GET /api/fiscal/cte
 * Lista CTes da organização
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const ctes = await db
      .select()
      .from(cteHeader)
      .where(
        and(
          eq(cteHeader.organizationId, organizationId),
          isNull(cteHeader.deletedAt)
        )
      )
      .orderBy(desc(cteHeader.createdAt));

    return NextResponse.json({
      success: true,
      data: ctes,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao buscar CTes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar CTes", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fiscal/cte
 * Cria CTe a partir de uma Ordem de Coleta
 * 🔐 Requer permissão: fiscal.cte.create
 * 
 * @since E8 Fase 2.4 - Migração parcial:
 *   - Mantém buildCteXml legacy (busca DB)
 *   - Mantém validatePickupOrderInsurance legacy
 * 
 * TODO (E8 Fase 3): Criar CreateCteUseCase que orquestre:
 *   1. Validar averbação via domain service
 *   2. Buscar dados da ordem de coleta
 *   3. CteBuilderService.build() para gerar XML
 */
export async function POST(req: NextRequest) {
  return withPermission(req, "fiscal.cte.create", async (user, ctx) => {
    try {
      const body = await req.json();
      const { pickupOrderId } = body;

      if (!pickupOrderId) {
        return NextResponse.json(
          { error: "Ordem de Coleta é obrigatória" },
          { status: 400 }
        );
      }

      // Validar Averbação (OBRIGATÓRIO) - mantém serviço legacy
      await validatePickupOrderInsurance(pickupOrderId);

      // Gerar XML - mantém serviço legacy (busca dados do DB)
      const xml = await buildCteXml({
        pickupOrderId,
        organizationId: ctx.organizationId,
      });

      return NextResponse.json({
        success: true,
        message: "CTe criado!",
        data: {
          xml: xml.substring(0, 500) + "...", // Preview
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao criar CTe:", error);
      return NextResponse.json(
        { error: "Erro ao criar CTe", details: errorMessage },
        { status: 500 }
      );
    }
  });
}
