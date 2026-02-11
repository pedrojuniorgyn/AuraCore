/**
 * API Routes: /api/strategic/standard-procedures/[id]
 * Operações em Procedimento específico
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
import type { IStandardProcedureRepository } from '@/modules/strategic/domain/ports/output/IStandardProcedureRepository';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
registerStrategicModule();

const uuidSchema = z.string().uuid();

const updateStandardProcedureSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  problemDescription: z.string().optional(),
  solution: z.string().optional(),
  standardOperatingProcedure: z.string().optional(),
  department: z.string().max(100).optional(),
  processName: z.string().max(200).optional(),
  nextReviewDate: z.string().datetime().transform((s) => new Date(s)).optional(),
});

// GET /api/strategic/standard-procedures/[id]
export const GET = withDI(async (
  request: NextRequest,
  routeCtx: RouteContext
) => {
  try {
    const context = await getTenantContext();
    const { id } = await routeCtx.params;

    // Validar UUID
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const repository = container.resolve<IStandardProcedureRepository>(
      STRATEGIC_TOKENS.StandardProcedureRepository
    );

    const procedure = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedimento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: procedure.id,
      code: procedure.code,
      title: procedure.title,
      problemDescription: procedure.problemDescription,
      rootCause: procedure.rootCause,
      solution: procedure.solution,
      standardOperatingProcedure: procedure.standardOperatingProcedure,
      department: procedure.department,
      processName: procedure.processName,
      ownerUserId: procedure.ownerUserId,
      version: procedure.version,
      lastReviewDate: procedure.lastReviewDate?.toISOString() ?? null,
      nextReviewDate: procedure.nextReviewDate?.toISOString() ?? null,
      status: procedure.status,
      needsReview: procedure.needsReview,
      attachments: procedure.attachments,
      sourceActionPlanId: procedure.sourceActionPlanId,
      createdBy: procedure.createdBy,
      createdAt: procedure.createdAt.toISOString(),
      updatedAt: procedure.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('GET /api/strategic/standard-procedures/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// PATCH /api/strategic/standard-procedures/[id]
export const PATCH = withDI(async (
  request: NextRequest,
  routeCtx: RouteContext
) => {
  try {
    const context = await getTenantContext();
    const { id } = await routeCtx.params;

    // Validar UUID
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateStandardProcedureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IStandardProcedureRepository>(
      STRATEGIC_TOKENS.StandardProcedureRepository
    );

    const procedure = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedimento não encontrado' },
        { status: 404 }
      );
    }

    // Nota: Entity StandardProcedure não tem métodos update genéricos
    // Apenas createNewVersion() para revisões
    // Para updates simples, seria necessário adicionar métodos na entity
    // Por ora, retornar 501 Not Implemented

    return NextResponse.json(
      { error: 'Update direto não implementado. Use /revision para criar nova versão.' },
      { status: 501 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('PATCH /api/strategic/standard-procedures/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// DELETE /api/strategic/standard-procedures/[id]
export const DELETE = withDI(async (
  request: NextRequest,
  routeCtx: RouteContext
) => {
  try {
    const context = await getTenantContext();
    const { id } = await routeCtx.params;

    // Validar UUID
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const repository = container.resolve<IStandardProcedureRepository>(
      STRATEGIC_TOKENS.StandardProcedureRepository
    );

    const procedure = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedimento não encontrado' },
        { status: 404 }
      );
    }

    // Soft delete
    await repository.delete(
      id,
      context.organizationId,
      context.branchId
    );

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('DELETE /api/strategic/standard-procedures/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
