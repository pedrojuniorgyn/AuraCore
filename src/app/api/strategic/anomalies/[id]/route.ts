/**
 * API Routes: /api/strategic/anomalies/[id]
 * Operações em Anomalia específica
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
import type { IAnomalyRepository } from '@/modules/strategic/domain/ports/output/IAnomalyRepository';
import type { AnomalySeverity } from '@/modules/strategic/domain/entities/Anomaly';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
registerStrategicModule();

const uuidSchema = z.string().uuid();

const updateAnomalySchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  responsibleUserId: z.string().uuid().optional(),
});

// GET /api/strategic/anomalies/[id]
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

    const repository = container.resolve<IAnomalyRepository>(
      STRATEGIC_TOKENS.AnomalyRepository
    );

    const anomaly = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!anomaly) {
      return NextResponse.json(
        { error: 'Anomalia não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: anomaly.id,
      code: anomaly.code,
      title: anomaly.title,
      description: anomaly.description,
      source: anomaly.source,
      sourceEntityId: anomaly.sourceEntityId,
      detectedAt: anomaly.detectedAt.toISOString(),
      detectedBy: anomaly.detectedBy,
      severity: anomaly.severity,
      processArea: anomaly.processArea,
      responsibleUserId: anomaly.responsibleUserId,
      status: anomaly.status,
      rootCauseAnalysis: anomaly.rootCauseAnalysis,
      why1: anomaly.why1,
      why2: anomaly.why2,
      why3: anomaly.why3,
      why4: anomaly.why4,
      why5: anomaly.why5,
      rootCause: anomaly.rootCause,
      actionPlanId: anomaly.actionPlanId,
      standardProcedureId: anomaly.standardProcedureId,
      resolution: anomaly.resolution,
      resolvedAt: anomaly.resolvedAt?.toISOString() ?? null,
      resolvedBy: anomaly.resolvedBy,
      daysOpen: anomaly.daysOpen,
      isOpen: anomaly.isOpen(),
      hasRootCauseAnalysis: anomaly.hasRootCauseAnalysis(),
      createdAt: anomaly.createdAt.toISOString(),
      updatedAt: anomaly.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('GET /api/strategic/anomalies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// PATCH /api/strategic/anomalies/[id]
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = updateAnomalySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IAnomalyRepository>(
      STRATEGIC_TOKENS.AnomalyRepository
    );

    const anomaly = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!anomaly) {
      return NextResponse.json(
        { error: 'Anomalia não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar severity se fornecido
    if (validation.data.severity) {
      const updateResult = anomaly.updateSeverity(validation.data.severity as AnomalySeverity);
      if (Result.isFail(updateResult)) {
        return NextResponse.json({ error: updateResult.error }, { status: 400 });
      }
    }

    // Atualizar responsável se fornecido
    if (validation.data.responsibleUserId) {
      const updateResult = anomaly.updateResponsibleUserId(validation.data.responsibleUserId);
      if (Result.isFail(updateResult)) {
        return NextResponse.json({ error: updateResult.error }, { status: 400 });
      }
    }

    // Persistir
    const saveResult = await repository.save(anomaly);

    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({
      id: anomaly.id,
      code: anomaly.code,
      severity: anomaly.severity,
      responsibleUserId: anomaly.responsibleUserId,
      message: 'Anomalia atualizada',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('PATCH /api/strategic/anomalies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// DELETE /api/strategic/anomalies/[id]
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

    const repository = container.resolve<IAnomalyRepository>(
      STRATEGIC_TOKENS.AnomalyRepository
    );

    const anomaly = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!anomaly) {
      return NextResponse.json(
        { error: 'Anomalia não encontrada' },
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
    logger.error('DELETE /api/strategic/anomalies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
