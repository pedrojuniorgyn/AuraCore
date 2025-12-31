import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCostCenterAllocations } from "@/services/cost-center-allocation";

/**
 * POST /api/financial/cost-centers/allocations
 * Cria rateio multi-CC para uma linha de lançamento
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { journalEntryLineId, allocations } = body;

    if (!journalEntryLineId || !allocations || allocations.length === 0) {
      return NextResponse.json(
        { error: "journalEntryLineId e allocations são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await createCostCenterAllocations({
      journalEntryLineId,
      allocations,
      createdBy: session.user.email || "system",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rateio criado com sucesso!",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao criar rateio:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



























