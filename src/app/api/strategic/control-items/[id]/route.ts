/**
 * API Routes: /api/strategic/control-items/[id]
 * Operações em Item de Controle específico
 * 
 * @module app/api/strategic
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IControlItemRepository } from '@/modules/strategic/domain/ports/output/IControlItemRepository';
import '@/modules/strategic/infrastructure/di/StrategicModule';

const uuidSchema = z.string().uuid();

const updateValueSchema = z.object({
  value: z.number(),
});

// GET /api/strategic/control-items/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    // Validar UUID
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const repository = container.resolve<IControlItemRepository>(
      STRATEGIC_TOKENS.ControlItemRepository
    );

    const item = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!item) {
      return NextResponse.json(
        { error: 'Item de controle não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      processArea: item.processArea,
      responsibleUserId: item.responsibleUserId,
      measurementFrequency: item.measurementFrequency,
      unit: item.unit,
      targetValue: item.targetValue,
      currentValue: item.currentValue,
      upperLimit: item.upperLimit,
      lowerLimit: item.lowerLimit,
      kpiId: item.kpiId,
      status: item.status,
      isWithinLimits: item.isWithinLimits(),
      isOnTarget: item.isOnTarget(),
      organizationId: item.organizationId,
      branchId: item.branchId,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/control-items/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/strategic/control-items/[id]/value
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    // Validar UUID
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateValueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IControlItemRepository>(
      STRATEGIC_TOKENS.ControlItemRepository
    );

    const item = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!item) {
      return NextResponse.json(
        { error: 'Item de controle não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar valor
    const updateResult = item.updateValue(validation.data.value);

    if (Result.isFail(updateResult)) {
      return NextResponse.json({ error: updateResult.error }, { status: 400 });
    }

    // Persistir
    const saveResult = await repository.save(item);

    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({
      id: item.id,
      code: item.code,
      currentValue: item.currentValue,
      isWithinLimits: item.isWithinLimits(),
      isOnTarget: item.isOnTarget(),
      message: 'Valor atualizado',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PATCH /api/strategic/control-items/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/strategic/control-items/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    // Validar UUID
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const repository = container.resolve<IControlItemRepository>(
      STRATEGIC_TOKENS.ControlItemRepository
    );

    const item = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!item) {
      return NextResponse.json(
        { error: 'Item de controle não encontrado' },
        { status: 404 }
      );
    }

    // Soft delete
    const deleteResult = await repository.delete(
      id,
      context.organizationId,
      context.branchId,
      context.userId
    );

    if (Result.isFail(deleteResult)) {
      return NextResponse.json({ error: deleteResult.error }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/control-items/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
