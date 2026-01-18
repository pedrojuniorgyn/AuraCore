import { NextRequest, NextResponse } from "next/server";
import { container } from 'tsyringe';
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Result } from '@/shared/domain';
import type { IGeneratePayableTitle } from '@/modules/financial/domain/ports/input/IGeneratePayableTitle';
import type { IGenerateReceivableTitle } from '@/modules/financial/domain/ports/input/IGenerateReceivableTitle';
import type { ExecutionContext } from '@/modules/financial/domain/ports/input/IPayAccountPayable';
import { initializeFinancialModule } from '@/modules/financial/infrastructure/di/FinancialModule';

// Garantir DI registrado (idempotente - seguro chamar múltiplas vezes)
initializeFinancialModule();

/**
 * 💰 POST /api/fiscal/documents/:id/generate-titles
 * 
 * Gera títulos financeiros (Contas a Pagar/Receber) automaticamente
 * 
 * Épico: E7.13 - Migrated to DDD/Hexagonal Architecture
 * Atualizado: E7.22.2 P3 - Migração para DI container
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Contexto multi-tenant (OBRIGATÓRIO)
    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    // 2. Resolver params
    const resolvedParams = await params;
    const fiscalDocumentId = resolvedParams.id;

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
          eq(fiscalDocuments.organizationId, ctx.organizationId),
          eq(fiscalDocuments.branchId, branchId)
        )
      );

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Documento fiscal não encontrado" },
        { status: 404 }
      );
    }

    // 4. Preparar ExecutionContext
    const executionContext: ExecutionContext = {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
      isAdmin: false, // Financial module requer isAdmin
    };

    // 5. Executar Use Case apropriado
    let result;

    if (document.fiscalClassification === "PURCHASE") {
      // Gerar título a pagar
      const useCase = container.resolve<IGeneratePayableTitle>(
        TOKENS.GeneratePayableTitleUseCase
      );
      
      result = await useCase.execute(
        {
          payableId: fiscalDocumentId,
          installments: 1,
          firstDueDate: new Date().toISOString(),
          intervalDays: 30,
        },
        executionContext
      );
    } else if (
      document.fiscalClassification === "CARGO" ||
      document.documentType === "CTE"
    ) {
      // Gerar título a receber
      const useCase = container.resolve<IGenerateReceivableTitle>(
        TOKENS.GenerateReceivableTitleUseCase
      );
      
      result = await useCase.execute(
        {
          receivableId: fiscalDocumentId,
          installments: 1,
          firstDueDate: new Date().toISOString(),
          intervalDays: 30,
        },
        executionContext
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Documento classificado como ${document.fiscalClassification}. ` +
                 `Apenas PURCHASE e CARGO geram títulos automaticamente.`,
        },
        { status: 400 }
      );
    }

    // 6. Processar resultado
    if (!result || Result.isFail(result)) {
      const errorMsg = result ? String(result.error) : 'Erro desconhecido';
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      titleIds: result.value.titleIds,
      titlesCount: result.value.titlesCount,
      message: `${result.value.titlesCount} título(s) gerado(s) com sucesso`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Response) {
      return error;
    }
    
    console.error("❌ Erro ao gerar títulos:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
