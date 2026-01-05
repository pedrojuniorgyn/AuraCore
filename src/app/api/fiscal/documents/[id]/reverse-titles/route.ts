import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { createReverseTitlesUseCase } from "@/modules/financial/infrastructure/di/FinancialModule";

/**
 * 🔄 POST /api/fiscal/documents/:id/reverse-titles
 * 
 * Reverte geração de títulos (soft delete)
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

    // 3. Executar Use Case
    const useCase = createReverseTitlesUseCase();
    const result = await useCase.execute({
      fiscalDocumentId,
      organizationId: BigInt(orgId),
    });

    // 4. Processar resultado
    if (result.isFailure) {
      const errorMessage = result.error instanceof Error 
        ? result.error.message 
        : typeof result.error === 'string'
          ? result.error
          : 'Erro desconhecido ao processar requisição';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Títulos revertidos com sucesso",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao reverter títulos:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}































