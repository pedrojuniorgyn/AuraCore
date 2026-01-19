import { NextRequest, NextResponse } from "next/server";
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Result } from '@/shared/domain';
import type { IReverseTitles } from '@/modules/financial/domain/ports/input/IReverseTitles';
import type { ExecutionContext } from '@/modules/financial/domain/ports/input/IPayAccountPayable';
import { initializeFinancialModule } from '@/modules/financial/infrastructure/di/FinancialModule';

// Garantir DI registrado (idempotente - seguro chamar múltiplas vezes)
initializeFinancialModule();

/**
 * 🔄 POST /api/fiscal/documents/:id/reverse-titles
 * 
 * Reverte geração de títulos (soft delete)
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

    // 3. Preparar ExecutionContext
    const executionContext: ExecutionContext = {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
      isAdmin: false, // Financial module requer isAdmin
    };

    // 4. Executar Use Case
    // Nota: Use Case busca os títulos internamente via fiscalDocumentId
    const useCase = container.resolve<IReverseTitles>(TOKENS.ReverseTitlesUseCase);
    
    const result = await useCase.execute(
      {
        titleIds: [fiscalDocumentId], // Use Case busca títulos por fiscalDocumentId
        reason: 'Estorno via API',
      },
      executionContext
    );

    // 5. Processar resultado
    if (Result.isFail(result)) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      reversedTitleIds: result.value.reversedTitleIds,
      count: result.value.count,
      message: `${result.value.count} título(s) revertido(s) com sucesso`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Response) {
      return error;
    }
    
    console.error("❌ Erro ao reverter títulos:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
