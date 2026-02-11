/**
 * API Routes: /api/strategic/verification-items
 * CRUD de Itens de Verificação (GEROT/Falconi)
 *
 * @module app/api/strategic/verification-items
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { getErrorMessage } from '@/shared/types/type-guards';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IVerificationItemRepository } from '@/modules/strategic/domain/ports/output/IVerificationItemRepository';
import type { IControlItemRepository } from '@/modules/strategic/domain/ports/output/IControlItemRepository';
import { VerificationItem } from '@/modules/strategic/domain/entities/VerificationItem';

import { logger } from '@/shared/infrastructure/logging';
const createVerificationItemSchema = z.object({
  controlItemId: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  verificationMethod: z.string().min(1).max(500),
  responsibleUserId: z.string().uuid(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  standardValue: z.string().min(1).max(100),
  correlationWeight: z.number().min(0).max(100).optional(),
});

const querySchema = z.object({
  controlItemId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// GET /api/strategic/verification-items
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { controlItemId, status, page, pageSize } = validation.data;

    const repository = container.resolve<IVerificationItemRepository>(
      STRATEGIC_TOKENS.VerificationItemRepository
    );

    const result = await repository.findAll(
      context.organizationId,
      context.branchId,
      { controlItemId, status },
      page,
      pageSize
    );

    const serializedItems = result.items.map((item) => ({
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
    }));

    return NextResponse.json({
      items: serializedItems,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    logger.error('GET /api/strategic/verification-items error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/verification-items
export const POST = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = createVerificationItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Validar que controlItemId pertence ao tenant
    const controlItemRepo = container.resolve<IControlItemRepository>(
      STRATEGIC_TOKENS.ControlItemRepository
    );
    const controlItem = await controlItemRepo.findById(
      validation.data.controlItemId,
      context.organizationId,
      context.branchId
    );

    if (!controlItem) {
      return NextResponse.json(
        { error: 'Control Item not found', details: { controlItemId: ['Item de Controle não encontrado'] } },
        { status: 404 }
      );
    }

    const itemResult = VerificationItem.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      ...validation.data,
    });

    if (Result.isFail(itemResult)) {
      return NextResponse.json({ error: itemResult.error }, { status: 400 });
    }

    const repository = container.resolve<IVerificationItemRepository>(
      STRATEGIC_TOKENS.VerificationItemRepository
    );

    const saveResult = await repository.save(itemResult.value);
    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: itemResult.value.id,
        code: itemResult.value.code,
        name: itemResult.value.name,
        message: 'Item de Verificação criado com sucesso',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    const message = getErrorMessage(error);
    logger.error('POST /api/strategic/verification-items error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
