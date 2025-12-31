import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { getTaxRatesSchema } from '@/lib/validators/tax-reform';
import { GetTaxRatesUseCase } from '@/modules/fiscal/application/use-cases';
import { Result } from '@/shared/domain';

/**
 * GET /api/fiscal/tax-reform/rates
 * 
 * Obter alíquotas vigentes IBS/CBS
 * 
 * Query params:
 * - uf: UF (2 caracteres) *obrigatório*
 * - date: Data de consulta (ISO) *obrigatório*
 * - municipioCode: Código do município (7 caracteres) *opcional*
 * 
 * Response 200:
 * {
 *   success: true,
 *   data: {
 *     uf: string,
 *     municipioCode?: string,
 *     date: string,
 *     rates: { ibsUf, ibsMun, cbs },
 *     source: 'DATABASE' | 'DEFAULT'
 *   }
 * }
 */
export async function GET(request: NextRequest) {
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

    // 3. Parse Query Params
    const searchParams = request.nextUrl.searchParams;
    const uf = searchParams.get('uf');
    const date = searchParams.get('date');
    const municipioCode = searchParams.get('municipioCode') || undefined;

    // 4. Validação
    const validation = getTaxRatesSchema.safeParse({
      uf,
      date,
      municipioCode,
    });
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetros inválidos',
          code: 'VALIDATION_ERROR',
          errors: validation.error.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // 5. Executar Use Case
    const useCase = new GetTaxRatesUseCase();

    const result = await useCase.execute(
      {
        organizationId: ctx.organizationId,
        branchId,
        uf: validation.data.uf,
        municipioCode: validation.data.municipioCode,
        date: new Date(validation.data.date),
      },
      {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        branchId,
        isAdmin: false,
      }
    );

    // 6. Tratar Resultado
    if (Result.isFail(result)) {
      return NextResponse.json(
        { success: false, error: result.error, code: 'BUSINESS_ERROR' },
        { status: 400 }
      );
    }

    // 7. Retornar Sucesso
    return NextResponse.json({
      success: true,
      data: result.value,
    });

  } catch (error) {
    // 8. Error Handling
    console.error('Error in GET /api/fiscal/tax-reform/rates:', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (error instanceof Response) {
      return error;
    }
    
    return NextResponse.json(
      { success: false, error: 'Erro interno', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

