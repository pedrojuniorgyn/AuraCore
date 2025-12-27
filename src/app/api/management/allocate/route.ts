import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { allocateIndirectCosts } from "@/services/management-accounting";

/**
 * POST /api/management/allocate
 * Aloca custos indiretos
 * 
 * Body: { period: "2024-12" }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { period } = body;

    if (!period) {
      return NextResponse.json(
        { error: "period é obrigatório (formato: YYYY-MM)" },
        { status: 400 }
      );
    }

    console.log(`📊 Alocando custos indiretos para ${period}...`);

    const organizationId = BigInt(session.user.organizationId);
    const result = await allocateIndirectCosts(period, organizationId);

    return NextResponse.json({
      success: true,
      message: `${result.allocated} alocações realizadas`,
      data: {
        allocatedCount: result.allocated,
        totalAmount: result.totalAmount,
        period,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao alocar custos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




















