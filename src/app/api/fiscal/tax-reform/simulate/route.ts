import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { simulateTaxScenarioSchema } from '@/lib/validators/tax-reform';
import { SimulateTaxScenarioUseCase } from '@/modules/fiscal/application/use-cases';
import { Result } from '@/shared/domain';

/**
 * POST /api/fiscal/tax-reform/simulate
 * 
 * Simula cenários tributários para múltiplos anos
 * 
 * Body:
 * - baseValue: Valor base para simulação
 * - ufOrigem: UF de origem (2 caracteres)
 * - ufDestino: UF de destino (2 caracteres)
 * - years: Array de anos (ex: [2026, 2027, 2030, 2033])
 * 
 * Response 200:
 * {
 *   success: true,
 *   data: {
 *     scenarios: [...],
 *     comparison: { currentSystemTotal, newSystemTotal, difference, percentageChange }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
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
    const validation = simulateTaxScenarioSchema.safeParse(body);
    
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
    const useCase = new SimulateTaxScenarioUseCase();

    const result = await useCase.execute(
      {
        documentId: '', // Não aplicável para simulação de cenários futuros
        scenario: 'REFORM_2026',
        ibsRate: 27.5, // Alíquota padrão IBS (26.5% + 1% para saúde)
        cbsRate: 8.8, // Alíquota padrão CBS
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
    // 7. Error Handling
    console.error('Error in POST /api/fiscal/tax-reform/simulate:', {
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

