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
import { StrategicGoal } from '@/modules/strategic/domain/entities/StrategicGoal';

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

// Schema para atualizar goal completo (PUT)
const updateGoalSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(500).optional(),
  targetValue: z.number().nullable().optional(),
  currentValue: z.number().nullable().optional(),
  baselineValue: z.number().nullable().optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  // ✅ BUG-FIX: Domain entity usa 'UP' | 'DOWN', não 'POSITIVE' | 'NEGATIVE'
  polarity: z.enum(['UP', 'DOWN']).optional(),
  dueDate: z.string().datetime().optional(),
});

// PUT /api/strategic/goals/[id]
export async function PUT(
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
    
    // ✅ BUG-001: Extrair props se vier como Domain Entity
    const payload = (body as { props?: unknown }).props ?? body;
    
    const validation = updateGoalSchema.safeParse(payload);
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

    // ✅ BUG-FIX: Atualizar usando reconstitute para manter domain entity válida
    // (Mapper.toPersistence espera entity com value objects como cascadeLevel.value)
    const data = validation.data;
    
    // Reconstitute domain entity com campos atualizados
    // (usa valores existentes quando data é undefined/null)
    const updatedGoalResult = StrategicGoal.reconstitute({
      id: goal.id,
      organizationId: goal.organizationId,
      branchId: goal.branchId,
      perspectiveId: goal.perspectiveId,
      parentGoalId: goal.parentGoalId,
      code: goal.code,
      description: data.description ?? goal.description,
      cascadeLevel: goal.cascadeLevel,
      targetValue: data.targetValue ?? goal.targetValue,
      currentValue: data.currentValue ?? goal.currentValue,
      baselineValue: data.baselineValue !== undefined ? data.baselineValue : goal.baselineValue,
      unit: data.unit ?? goal.unit,
      weight: data.weight ?? goal.weight,
      polarity: data.polarity ?? goal.polarity,
      ownerUserId: goal.ownerUserId,
      ownerBranchId: goal.ownerBranchId,
      startDate: goal.startDate,
      dueDate: data.dueDate !== undefined ? new Date(data.dueDate) : goal.dueDate,
      status: goal.status,
      mapPositionX: goal.mapPositionX,
      mapPositionY: goal.mapPositionY,
      createdBy: goal.createdBy,
      createdAt: goal.createdAt,
      updatedAt: new Date(),
    });

    if (Result.isFail(updatedGoalResult)) {
      return NextResponse.json(
        { error: 'Failed to reconstitute goal', details: updatedGoalResult.error },
        { status: 500 }
      );
    }

    await repository.save(updatedGoalResult.value);

    // Buscar goal atualizado para retornar
    const refreshedGoal = await repository.findById(
      idResult.data,
      context.organizationId,
      context.branchId
    );

    if (!refreshedGoal) {
      return NextResponse.json({ error: 'Goal not found after update' }, { status: 500 });
    }

    return NextResponse.json({
      id: refreshedGoal.id,
      perspectiveId: refreshedGoal.perspectiveId,
      parentGoalId: refreshedGoal.parentGoalId,
      code: refreshedGoal.code,
      description: refreshedGoal.description,
      cascadeLevel: refreshedGoal.cascadeLevel.value,
      targetValue: refreshedGoal.targetValue,
      currentValue: refreshedGoal.currentValue,
      baselineValue: refreshedGoal.baselineValue,
      unit: refreshedGoal.unit,
      polarity: refreshedGoal.polarity,
      weight: refreshedGoal.weight,
      ownerUserId: refreshedGoal.ownerUserId,
      ownerBranchId: refreshedGoal.ownerBranchId,
      status: refreshedGoal.status.value,
      statusLabel: refreshedGoal.status.label,
      statusColor: refreshedGoal.status.color,
      progress: refreshedGoal.progress,
      mapPositionX: refreshedGoal.mapPositionX,
      mapPositionY: refreshedGoal.mapPositionY,
      startDate: refreshedGoal.startDate.toISOString(),
      dueDate: refreshedGoal.dueDate.toISOString(),
      createdBy: refreshedGoal.createdBy,
      createdAt: refreshedGoal.createdAt.toISOString(),
      updatedAt: refreshedGoal.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PUT /api/strategic/goals/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
