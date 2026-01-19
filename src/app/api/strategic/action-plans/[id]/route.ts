/**
 * API Routes: /api/strategic/action-plans/[id]
 * Operações em plano de ação específico
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { AdvancePDCACycleUseCase } from '@/modules/strategic/application/commands/AdvancePDCACycleUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';

const advancePDCASchema = z.object({
  completionPercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// GET /api/strategic/action-plans/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    const plan = await repository.findById(id, context.organizationId, context.branchId);

    if (!plan) {
      return NextResponse.json({ error: 'Plano de ação não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: plan.id,
      code: plan.code,
      what: plan.what,
      why: plan.why,
      whereLocation: plan.whereLocation,
      whenStart: plan.whenStart.toISOString(),
      whenEnd: plan.whenEnd.toISOString(),
      who: plan.who,
      whoUserId: plan.whoUserId,
      how: plan.how,
      howMuchAmount: plan.howMuchAmount,
      howMuchCurrency: plan.howMuchCurrency,
      pdcaCycle: plan.pdcaCycle.value,
      completionPercent: plan.completionPercent,
      priority: plan.priority,
      status: plan.status,
      isOverdue: plan.isOverdue,
      goalId: plan.goalId,
      parentActionPlanId: plan.parentActionPlanId,
      repropositionNumber: plan.repropositionNumber,
      repropositionReason: plan.repropositionReason,
      evidenceUrls: plan.evidenceUrls,
      nextFollowUpDate: plan.nextFollowUpDate?.toISOString() ?? null,
      canRepropose: plan.canRepropose,
      createdBy: plan.createdBy,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/action-plans/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/strategic/action-plans/[id]/advance - Avançar PDCA
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const body = await request.json();
    const validation = advancePDCASchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(AdvancePDCACycleUseCase);
    const result = await useCase.execute(
      {
        actionPlanId: id,
        ...validation.data,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PUT /api/strategic/action-plans/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/strategic/action-plans/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    await repository.delete(id, context.organizationId, context.branchId);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/action-plans/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
