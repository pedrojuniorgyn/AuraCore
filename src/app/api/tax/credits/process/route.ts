import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TaxCreditCalculator } from "@/modules/fiscal/domain/services/TaxCreditCalculator";
import { createTaxCreditRepository } from "@/modules/fiscal/infrastructure/persistence/DrizzleTaxCreditRepository";
import { createProcessTaxCreditsUseCase } from "@/modules/fiscal/application/use-cases/ProcessTaxCreditsUseCase";
import { Result } from "@/shared/domain";

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

    // Criar dependências
    const calculator = new TaxCreditCalculator();
    const repository = createTaxCreditRepository();
    const useCase = createProcessTaxCreditsUseCase(calculator, repository);

    // Executar use case
    const result = await useCase.execute({
      organizationId,
      userId,
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    const response = result.value;

    return NextResponse.json({
      success: true,
      message: `Processados ${response.processed} documentos`,
      data: {
        documentsProcessed: response.processed,
        totalCreditGenerated: response.totalCredit,
        errors: response.errors,
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao processar créditos:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}































