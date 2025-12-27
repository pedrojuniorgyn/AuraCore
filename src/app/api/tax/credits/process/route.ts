import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processPendingTaxCredits } from "@/services/tax-credit-engine";

/**
 * POST /api/tax/credits/process
 * Processa créditos fiscais pendentes (PIS/COFINS)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = BigInt(session.user.organizationId);
    const userId = session.user.email || "system";

    console.log("🔍 Processando créditos fiscais pendentes...");

    const result = await processPendingTaxCredits(organizationId, userId);

    return NextResponse.json({
      success: true,
      message: `Processados ${result.processed} documentos`,
      data: {
        documentsProcessed: result.processed,
        totalCreditGenerated: result.totalCredit,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao processar créditos:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}





















