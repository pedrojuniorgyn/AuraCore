/**
 * API Route: /api/strategic/action-plans/[id]/status
 * Atualização de status do plano de ação
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';
import type { ActionPlanStatus } from '@/modules/strategic/domain/entities/ActionPlan';

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED']),
});

// PATCH /api/strategic/action-plans/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const newStatus = validation.data.status as ActionPlanStatus;

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    // Buscar plano existente
    const plan = await repository.findById(id, context.organizationId, context.branchId);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plano de ação não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar status usando método da entity
    const updateResult = plan.updateStatus(newStatus);

    if (Result.isFail(updateResult)) {
      return NextResponse.json(
        { error: updateResult.error },
        { status: 400 }
      );
    }

    // Persistir
    await repository.save(plan);

    return NextResponse.json({
      id: plan.id,
      status: plan.status,
      completionPercent: plan.completionPercent,
      message: 'Status atualizado com sucesso',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PATCH /api/strategic/action-plans/[id]/status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
