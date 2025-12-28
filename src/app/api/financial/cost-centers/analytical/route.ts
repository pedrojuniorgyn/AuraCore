import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { costCenters } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/financial/cost-centers/analytical
 * Retorna apenas centros de custo ANALÍTICOS (para uso em selects)
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const analyticalCostCenters = await db
      .select({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
        linkedVehicleId: costCenters.linkedVehicleId,
      })
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, organizationId),
          eq(costCenters.type, "ANALYTIC"),
          eq(costCenters.status, "ACTIVE"),
          isNull(costCenters.deletedAt)
        )
      )
      .orderBy(costCenters.code);

    return NextResponse.json({
      success: true,
      data: analyticalCostCenters,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar centros de custo analíticos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar centros de custo analíticos" },
      { status: 500 }
    );
  }
}


























