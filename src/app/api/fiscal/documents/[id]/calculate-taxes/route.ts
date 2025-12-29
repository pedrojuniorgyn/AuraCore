import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { CalculateTaxesUseCase } from '@/modules/fiscal/application/use-cases';
import { Result } from '@/shared/domain';
import { 
  isValidUUID, 
  getHttpStatusFromError,
  CalculateTaxesSchema 
} from '@/modules/fiscal/presentation/validators';
import { initializeFiscalModule } from '@/modules/fiscal/infrastructure/bootstrap';

// Garantir DI registrado
initializeFiscalModule();

/**
 * POST /api/fiscal/documents/[id]/calculate-taxes
 * 
 * Calcula impostos para um documento fiscal
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod schema + UUID
 * DDD: ✅ Use Case
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Contexto multi-tenant (OBRIGATÓRIO)
    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    
    // 2. Validar ID
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID do documento inválido (deve ser UUID)'
      }, { status: 400 });
    }
    
    // 3. Validar body (opcional)
    const body = await request.json().catch(() => ({}));
    const validationResult = CalculateTaxesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados de cálculo inválidos',
        details: validationResult.error.issues
      }, { status: 400 });
    }
    
    // 4. Executar Use Case
    const useCase = container.resolve(CalculateTaxesUseCase);
    const result = await useCase.execute(
      {
        fiscalDocumentId: id
      },
      {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        branchId,
        isAdmin: ctx.isAdmin || false
      }
    );
    
    // 5. Retornar resultado
    if (Result.isFail(result)) {
      const status = getHttpStatusFromError(result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status });
    }
    
    return NextResponse.json({
      success: true,
      data: result.value
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Response) {
      return error;
    }
    
    console.error('[POST /api/fiscal/documents/[id]/calculate-taxes]', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao calcular impostos',
      details: errorMessage
    }, { status: 500 });
  }
}

