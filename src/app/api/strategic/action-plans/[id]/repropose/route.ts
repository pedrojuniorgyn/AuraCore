/**
 * API Route: POST /api/strategic/action-plans/[id]/repropose
 * Reproposição de plano de ação que falhou ou precisa de extensão
 *
 * @module api/strategic/action-plans
 * @see ADR-0022
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IReproposeActionPlanUseCase } from '@/modules/strategic/domain/ports/input/IReproposeActionPlanUseCase';

/**
 * Schema de validação do input
 */
const ReproposeActionPlanSchema = z.object({
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
  newWhenEnd: z.string().datetime('Data deve estar no formato ISO'),
  newWhoUserId: z.string().optional(),
  newWho: z.string().optional(),
});

type ReproposeActionPlanBody = z.infer<typeof ReproposeActionPlanSchema>;

/**
 * POST /api/strategic/action-plans/[id]/repropose
 * Reproposição de plano de ação
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Obter contexto do usuário autenticado
    const context = await getTenantContext();

    // 2. Parsear e validar body
    const body: unknown = await request.json();
    const parseResult = ReproposeActionPlanSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data as ReproposeActionPlanBody;

    // 3. Resolver parâmetros da rota
    const { id } = await params;

    // 4. Executar use case
    const useCase = container.resolve<IReproposeActionPlanUseCase>(
      STRATEGIC_TOKENS.ReproposeActionPlanUseCase
    );

    const result = await useCase.execute(
      {
        originalPlanId: id,
        reason: validatedData.reason,
        newWhenEnd: new Date(validatedData.newWhenEnd),
        newWhoUserId: validatedData.newWhoUserId,
        newWho: validatedData.newWho,
      },
      context
    );

    // 5. Retornar resultado
    if (result.isSuccess) {
      return NextResponse.json(
        {
          success: true,
          data: result.value,
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] Erro ao repropor plano de ação:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao processar reproposição',
      },
      { status: 500 }
    );
  }
}
