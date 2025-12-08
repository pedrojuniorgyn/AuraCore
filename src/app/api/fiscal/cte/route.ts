import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cteHeader } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { buildCteXml } from "@/services/fiscal/cte-builder";
import { validatePickupOrderInsurance } from "@/services/validators/insurance-validator";

/**
 * GET /api/fiscal/cte
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
  } catch (error: any) {
    console.error("❌ Erro ao buscar CTes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar CTes", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fiscal/cte
 * Cria CTe a partir de uma Ordem de Coleta
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const createdBy = session.user.email || "system";

    const body = await req.json();
    const { pickupOrderId } = body;

    if (!pickupOrderId) {
      return NextResponse.json(
        { error: "Ordem de Coleta é obrigatória" },
        { status: 400 }
      );
    }

    // Validar Averbação (OBRIGATÓRIO)
    await validatePickupOrderInsurance(pickupOrderId);

    // Gerar XML
    const xml = await buildCteXml({
      pickupOrderId,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      message: "CTe criado!",
      data: {
        xml: xml.substring(0, 500) + "...", // Preview
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar CTe:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar CTe" },
      { status: 500 }
    );
  }
}

