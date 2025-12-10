import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chartOfAccounts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/financial/chart-accounts/analytical
 * Retorna apenas contas ANALÍTICAS (para uso em selects)
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const analyticalAccounts = await db
      .select({
        id: chartOfAccounts.id,
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
        type: chartOfAccounts.type,
        category: chartOfAccounts.category,
        acceptsCostCenter: chartOfAccounts.acceptsCostCenter,
        requiresCostCenter: chartOfAccounts.requiresCostCenter,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          eq(chartOfAccounts.isAnalytical, true),
          eq(chartOfAccounts.status, "ACTIVE"),
          isNull(chartOfAccounts.deletedAt)
        )
      )
      .orderBy(chartOfAccounts.code);

    return NextResponse.json({
      success: true,
      data: analyticalAccounts,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar contas analíticas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar contas analíticas" },
      { status: 500 }
    );
  }
}







