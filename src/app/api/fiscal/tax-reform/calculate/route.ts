import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { calculateIbsCbsSchema } from '@/lib/validators/tax-reform';
import { CalculateIbsCbsUseCase } from '@/modules/fiscal/application/use-cases';
import { Result } from '@/shared/domain';
import { logger } from '@/shared/infrastructure/logging';

/**
 * POST /api/fiscal/tax-reform/calculate
 * 
 * Calcula IBS/CBS para documento fiscal
 * 
 * Body:
 * - fiscalDocumentId: UUID do documento
 * - operationDate: Data da operação (ISO)
 * - items: Array de itens com baseValue, cfop, ncm, UFs
 * 
 * Response 200:
 * {
 *   success: true,
 *   data: {
 *     regime: 'CURRENT' | 'TRANSITION' | 'NEW',
 *     items: [...],
 *     totals: { totalBaseValue, totalIbsUf, totalIbsMun, totalCbs }
 *   }
 * }
 * 
 * Response 400: Validation error ou business error
 * Response 401: Não autenticado
 * Response 500: Erro interno
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
    const validation = calculateIbsCbsSchema.safeParse(body);
    
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
    const useCase = new CalculateIbsCbsUseCase();

    const result = await useCase.execute(
      {
        fiscalDocumentId: validation.data.fiscalDocumentId,
        organizationId: ctx.organizationId,
        branchId,
        operationDate: new Date(validation.data.operationDate),
        items: validation.data.items,
      },
      {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        branchId,
        isAdmin: false,
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
    logger.error('Error in POST /api/fiscal/tax-reform/calculate', error);
    
    if (error instanceof Response) {
      return error; // Preserva NextResponse de helpers
    }
    
    return NextResponse.json(
      { success: false, error: 'Erro interno', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

