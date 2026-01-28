/**
 * API Routes: /api/strategic/goals/[id]
 * Operações em objetivo estratégico específico
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';

const idSchema = z.string().trim().uuid();

// GET /api/strategic/goals/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });
    }

    const repository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    const goal = await repository.findById(
      idResult.data,
      context.organizationId,
      context.branchId
    );

    if (!goal) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: goal.id,
      perspectiveId: goal.perspectiveId,
      parentGoalId: goal.parentGoalId,
      code: goal.code,
      description: goal.description,
      cascadeLevel: goal.cascadeLevel.value,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      baselineValue: goal.baselineValue,
      unit: goal.unit,
      polarity: goal.polarity,
      weight: goal.weight,
      ownerUserId: goal.ownerUserId,
      ownerBranchId: goal.ownerBranchId,
      status: goal.status.value,
      statusLabel: goal.status.label,
      statusColor: goal.status.color,
      progress: goal.progress,
      mapPositionX: goal.mapPositionX,
      mapPositionY: goal.mapPositionY,
      startDate: goal.startDate.toISOString(),
      dueDate: goal.dueDate.toISOString(),
      createdBy: goal.createdBy,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/goals/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Schema para atualizar progresso
const updateProgressSchema = z.object({
  currentValue: z.number(),
});

// PATCH /api/strategic/goals/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const validation = updateProgressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    const goal = await repository.findById(
      idResult.data,
      context.organizationId,
      context.branchId
    );

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Atualizar progresso
    const updateResult = goal.updateProgress(validation.data.currentValue);
    if (Result.isFail(updateResult)) {
      return NextResponse.json({ error: updateResult.error }, { status: 400 });
    }

    await repository.save(goal);

    return NextResponse.json({
      id: goal.id,
      currentValue: goal.currentValue,
      progress: goal.progress,
      status: goal.status.value,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PATCH /api/strategic/goals/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/strategic/goals/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });
    }

    const repository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    await repository.delete(idResult.data, context.organizationId, context.branchId);

    return NextResponse.json({ message: 'Goal removed successfully' });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/goals/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
