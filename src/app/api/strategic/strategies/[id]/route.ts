/**
 * API Routes: /api/strategic/strategies/[id]
 * Operações em estratégia específica
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { ActivateStrategyUseCase } from '@/modules/strategic/application/commands/ActivateStrategyUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';

// GET /api/strategic/strategies/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const repository = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    const strategy = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!strategy) {
      return NextResponse.json({ error: 'Estratégia não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      id: strategy.id,
      name: strategy.name,
      vision: strategy.vision,
      mission: strategy.mission,
      values: strategy.values,
      status: strategy.status,
      startDate: strategy.startDate.toISOString(),
      endDate: strategy.endDate.toISOString(),
      createdBy: strategy.createdBy,
      createdAt: strategy.createdAt.toISOString(),
      updatedAt: strategy.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/strategies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/strategies/[id]/activate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;
    
    // Verificar se é ação de ativação
    const url = new URL(request.url);
    if (url.pathname.endsWith('/activate')) {
      const useCase = container.resolve(ActivateStrategyUseCase);
      const result = await useCase.execute({ strategyId: id }, context);

      if (Result.isFail(result)) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ message: 'Estratégia ativada com sucesso' });
    }

    return NextResponse.json({ error: 'Ação não suportada' }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/strategies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/strategic/strategies/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const repository = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    await repository.delete(id, context.organizationId, context.branchId);

    return NextResponse.json({ message: 'Estratégia arquivada com sucesso' });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/strategies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
