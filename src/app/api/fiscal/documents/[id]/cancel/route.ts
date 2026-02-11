import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { CancelFiscalDocumentUseCase } from '@/modules/fiscal/application/use-cases';
import { Result } from '@/shared/domain';
import { 
  isValidUUID, 
  getHttpStatusFromError,
  CancelFiscalDocumentSchema 
} from '@/modules/fiscal/presentation/validators';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';

import { logger } from '@/shared/infrastructure/logging';

/**
 * POST /api/fiscal/documents/[id]/cancel
 * 
 * Cancela um documento fiscal (AUTHORIZED -> CANCELLED)
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod schema + UUID
 * DDD: ✅ Use Case
 */
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { id } = await context.params;
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
    
    // 3. Validar body com Zod
    const body = await request.json();
    const validationResult = CancelFiscalDocumentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados de cancelamento inválidos',
        details: validationResult.error.issues
      }, { status: 400 });
    }
    
    // 4. Executar Use Case
    const useCase = container.resolve(CancelFiscalDocumentUseCase);
    const result = await useCase.execute(
      {
        documentId: id, // Input Port usa 'documentId', não 'id'
        reason: validationResult.data.reason,
        protocolNumber: validationResult.data.protocolNumber
      },
      {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        branchId
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
    
    logger.error('[POST /api/fiscal/documents/[id]/cancel]', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao cancelar documento fiscal',
      details: errorMessage
    }, { status: 500 });
  }
});

