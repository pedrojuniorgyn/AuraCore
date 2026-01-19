/**
 * API Route: /api/strategic/strategies/[id]/activate
 * Ativa uma estratégia
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { ActivateStrategyUseCase } from '@/modules/strategic/application/commands/ActivateStrategyUseCase';

// POST /api/strategic/strategies/[id]/activate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const useCase = container.resolve(ActivateStrategyUseCase);
    const result = await useCase.execute({ strategyId: id }, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Estratégia ativada com sucesso',
      strategyId: id
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/strategies/[id]/activate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
