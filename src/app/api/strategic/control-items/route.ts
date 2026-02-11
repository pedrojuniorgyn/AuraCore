/**
 * API Routes: /api/strategic/control-items
 * CRUD de Itens de Controle (GEROT)
 * 
 * @module app/api/strategic
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { ControlItem } from '@/modules/strategic/domain/entities/ControlItem';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IControlItemRepository } from '@/modules/strategic/domain/ports/output/IControlItemRepository';
import '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
const createControlItemSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  processArea: z.string().min(1).max(100),
  responsibleUserId: z.string().uuid(),
  measurementFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']),
  unit: z.string().min(1).max(20),
  targetValue: z.number(),
  upperLimit: z.number(),
  lowerLimit: z.number(),
  kpiId: z.string().uuid().optional(),
});

// GET /api/strategic/control-items
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const processArea = searchParams.get('processArea') ?? undefined;
    const status = searchParams.get('status') as 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW' | undefined;
    const responsibleUserId = searchParams.get('responsibleUserId') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const repository = container.resolve<IControlItemRepository>(
      STRATEGIC_TOKENS.ControlItemRepository
    );

    const result = await repository.findAll(
      context.organizationId,
      context.branchId,
      { processArea, status, responsibleUserId },
      page,
      pageSize
    );

    return NextResponse.json({
      items: result.items.map(item => ({
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
      })),
      total: result.total,
      page,
      pageSize,
      filters: { processArea, status, responsibleUserId },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('GET /api/strategic/control-items error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/control-items
export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createControlItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Verificar se código já existe
    const repository = container.resolve<IControlItemRepository>(
      STRATEGIC_TOKENS.ControlItemRepository
    );

    const existing = await repository.findByCode(
      validation.data.code,
      context.organizationId,
      context.branchId
    );

    if (existing) {
      return NextResponse.json(
        { error: `Item de controle com código ${validation.data.code} já existe` },
        { status: 409 }
      );
    }

    // Criar entity
    const controlItemResult = ControlItem.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      code: validation.data.code,
      name: validation.data.name,
      description: validation.data.description,
      processArea: validation.data.processArea,
      responsibleUserId: validation.data.responsibleUserId,
      measurementFrequency: validation.data.measurementFrequency,
      unit: validation.data.unit,
      targetValue: validation.data.targetValue,
      upperLimit: validation.data.upperLimit,
      lowerLimit: validation.data.lowerLimit,
      kpiId: validation.data.kpiId,
      createdBy: context.userId,
    });

    if (Result.isFail(controlItemResult)) {
      return NextResponse.json({ error: controlItemResult.error }, { status: 400 });
    }

    const entity = controlItemResult.value;

    // Persistir via repository
    const saveResult = await repository.save(entity);

    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      message: 'Item de controle criado',
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/strategic/control-items error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
