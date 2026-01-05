import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import {
  createGeneratePayableTitleUseCase,
  createGenerateReceivableTitleUseCase,
} from "@/modules/financial/infrastructure/di/FinancialModule";

/**
 * 💰 POST /api/fiscal/documents/:id/generate-titles
 * 
 * Gera títulos financeiros (Contas a Pagar/Receber) automaticamente
 * 
 * Épico: E7.13 - Migrated to DDD/Hexagonal Architecture
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validar contexto de tenant
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json(
        { error: 'Contexto de tenant não encontrado' },
        { status: 401 }
      );
    }

    // 2. Garantir que os valores são números válidos
    const orgId = typeof ctx.organizationId === 'number'
      ? ctx.organizationId
      : Number(ctx.organizationId);

    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'IDs de organização inválidos' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const fiscalDocumentId = BigInt(resolvedParams.id);
    const userId = ctx.userId;

    // 3. Buscar documento para determinar o tipo de título
    const { db } = await import("@/lib/db");
    const { fiscalDocuments } = await import("@/lib/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, Number(fiscalDocumentId)),
          eq(fiscalDocuments.organizationId, orgId)
        )
      );

    if (!document) {
      return NextResponse.json(
        { error: "Documento fiscal não encontrado" },
        { status: 404 }
      );
    }

    // 4. Executar Use Case apropriado
    let result;

    if (document.fiscalClassification === "PURCHASE") {
      const useCase = createGeneratePayableTitleUseCase();
      result = await useCase.execute({
        fiscalDocumentId,
        userId,
        organizationId: BigInt(orgId),
      });
    } else if (
      document.fiscalClassification === "CARGO" ||
      document.documentType === "CTE"
    ) {
      const useCase = createGenerateReceivableTitleUseCase();
      result = await useCase.execute({
        fiscalDocumentId,
        userId,
        organizationId: BigInt(orgId),
      });
    } else {
      return NextResponse.json(
        {
          error: `Documento classificado como ${document.fiscalClassification}. ` +
                 `Apenas PURCHASE e CARGO geram títulos automaticamente.`,
        },
        { status: 400 }
      );
    }

    // 5. Processar resultado
    if (result.isFailure) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      titleId: result.value.titleId.toString(), // BigInt como string
      type: result.value.type,
      amount: result.value.amount,
      message: `Título ${result.value.type} gerado com sucesso`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao gerar títulos:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}














