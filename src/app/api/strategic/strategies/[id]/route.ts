/**
 * API Routes: /api/strategic/strategies/[id]
 * Operações em estratégia específica
 * 
 * Nota: POST /activate é tratado em ./activate/route.ts
 * 
 * @module app/api/strategic
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';

// ✅ S1.1 Batch 3 Phase 2: ID param validation
const idParamSchema = z.object({
  id: z.string().uuid('ID da estratégia inválido'),
});

// GET /api/strategic/strategies/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const resolvedParams = await params;
    
    // ✅ S1.1 Batch 3 Phase 2: Validate ID
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { id } = validation.data;

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

// DELETE /api/strategic/strategies/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const resolvedParams = await params;
    
    // ✅ S1.1 Batch 3 Phase 2: Validate ID
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { id } = validation.data;

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
