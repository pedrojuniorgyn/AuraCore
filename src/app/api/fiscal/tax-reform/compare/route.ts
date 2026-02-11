import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { compareTaxRegimesSchema } from '@/lib/validators/tax-reform';
import { CompareTaxRegimesUseCase } from '@/modules/fiscal/application/use-cases';
import { Result } from '@/shared/domain';
import { logger } from '@/shared/infrastructure/logging';

/**
 * POST /api/fiscal/tax-reform/compare
 * 
 * Compara regimes tributários (atual vs novo)
 * 
 * Body:
 * - fiscalDocumentId: UUID do documento fiscal
 * 
 * Response 200:
 * {
 *   success: true,
 *   data: {
 *     currentRegime: { icms, pis, cofins, total },
 *     newRegime: { ibsUf, ibsMun, cbs, total },
 *     difference: { amount, currency },
 *     percentageChange: number,
 *     recommendation: string
 *   }
 * }
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    // 1. Autenticação e Tenant Context
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Branch Resolution
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    // 3. Parse e Validação do Body
    const body = await request.json();
    const validation = compareTaxRegimesSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          errors: validation.error.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // 4. Executar Use Case
    const useCase = new CompareTaxRegimesUseCase();

    const result = await useCase.execute(
      {
        documentId: validation.data.fiscalDocumentId,
        regimes: validation.data.regimes, // Usa input do usuário (com default no schema)
      },
      {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        branchId,
      }
    );

    // 5. Tratar Resultado
    if (Result.isFail(result)) {
      return NextResponse.json(
        { success: false, error: result.error, code: 'BUSINESS_ERROR' },
        { status: 400 }
      );
    }

    // 6. Retornar Sucesso
    return NextResponse.json({
      success: true,
      data: result.value,
    });

  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    // 7. Error Handling
    logger.error('Error in POST /api/fiscal/tax-reform/compare', error);
    
    if (error instanceof Response) {
      return error;
    }
    
    return NextResponse.json(
      { success: false, error: 'Erro interno', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

