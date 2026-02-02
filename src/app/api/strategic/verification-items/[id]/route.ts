/**
 * API Routes: /api/strategic/verification-items/[id]
 * Operações individuais em Item de Verificação
 *
 * @module app/api/strategic/verification-items/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IVerificationItemRepository } from '@/modules/strategic/domain/ports/output/IVerificationItemRepository';

interface RouteContext {
  params: Promise<Record<string, string>>;
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  verificationMethod: z.string().min(1).max(500).optional(),
  responsibleUserId: z.string().uuid().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  standardValue: z.string().min(1).max(100).optional(),
  correlationWeight: z.number().min(0).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// GET /api/strategic/verification-items/[id]
export const GET = withDI(async (_request: NextRequest, context: RouteContext) => {
  const params = context.params;
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const repository = container.resolve<IVerificationItemRepository>(
      STRATEGIC_TOKENS.VerificationItemRepository
    );

    const item = await repository.findById(id, context.organizationId, context.branchId);

    if (!item) {
      return NextResponse.json({ error: 'Verification Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: item.id,
      controlItemId: item.controlItemId,
      code: item.code,
      name: item.name,
      description: item.description,
      verificationMethod: item.verificationMethod,
      responsibleUserId: item.responsibleUserId,
      frequency: item.frequency,
      standardValue: item.standardValue,
      currentValue: item.currentValue,
      lastVerifiedAt: item.lastVerifiedAt?.toISOString() ?? null,
      lastVerifiedBy: item.lastVerifiedBy,
      status: item.status,
      correlationWeight: item.correlationWeight,
      isCompliant: item.isCompliant(),
      isOverdue: item.isOverdue(),
      daysSinceLastVerification: item.daysSinceLastVerification(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/verification-items/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// PATCH /api/strategic/verification-items/[id]
export const PATCH = withDI(async (request: NextRequest, context: RouteContext) => {
  const params = context.params;
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IVerificationItemRepository>(
      STRATEGIC_TOKENS.VerificationItemRepository
    );

    const item = await repository.findById(id, context.organizationId, context.branchId);

    if (!item) {
      return NextResponse.json({ error: 'Verification Item not found' }, { status: 404 });
    }

    // Aplicar atualizações
    const updates = validation.data;
    
    if (updates.standardValue) {
      const result = item.updateStandardValue(updates.standardValue);
      if (Result.isFail(result)) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    if (updates.status === 'INACTIVE') {
      const result = item.deactivate();
      if (Result.isFail(result)) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    const saveResult = await repository.save(item);
    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({
      id: item.id,
      message: 'Item de Verificação atualizado com sucesso',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('PATCH /api/strategic/verification-items/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// DELETE /api/strategic/verification-items/[id]
export const DELETE = withDI(async (_request: NextRequest, context: RouteContext) => {
  const params = context.params;
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const repository = container.resolve<IVerificationItemRepository>(
      STRATEGIC_TOKENS.VerificationItemRepository
    );

    const item = await repository.findById(id, context.organizationId, context.branchId);

    if (!item) {
      return NextResponse.json({ error: 'Verification Item not found' }, { status: 404 });
    }

    const deleteResult = await repository.delete(
      id, 
      context.organizationId, 
      context.branchId,
      context.userId
    );

    if (Result.isFail(deleteResult)) {
      return NextResponse.json({ error: deleteResult.error }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Item de Verificação removido com sucesso',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/verification-items/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
