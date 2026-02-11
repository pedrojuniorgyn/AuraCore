/**
 * API Routes: /api/strategic/anomalies
 * CRUD de Anomalias (GEROT)
 *
 * @module app/api/strategic
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { Anomaly } from '@/modules/strategic/domain/entities/Anomaly';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IAnomalyRepository } from '@/modules/strategic/domain/ports/output/IAnomalyRepository';
import type { AnomalyStatus, AnomalySeverity, AnomalySource } from '@/modules/strategic/domain/entities/Anomaly';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
registerStrategicModule();

const createAnomalySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  source: z.enum(['CONTROL_ITEM', 'KPI', 'MANUAL', 'AUDIT']),
  sourceEntityId: z.string().uuid().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  processArea: z.string().trim().min(1).max(100),
  responsibleUserId: z.string().uuid(),
});

// GET /api/strategic/anomalies
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AnomalyStatus | undefined;
    const severity = searchParams.get('severity') as AnomalySeverity | undefined;
    const processArea = searchParams.get('processArea') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const repository = container.resolve<IAnomalyRepository>(
      STRATEGIC_TOKENS.AnomalyRepository
    );

    const result = await repository.findAll(
      context.organizationId,
      context.branchId,
      { status, severity, processArea },
      page,
      pageSize
    );

    return NextResponse.json({
      items: result.items.map(item => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description,
        source: item.source,
        sourceEntityId: item.sourceEntityId,
        detectedAt: item.detectedAt.toISOString(),
        detectedBy: item.detectedBy,
        severity: item.severity,
        processArea: item.processArea,
        responsibleUserId: item.responsibleUserId,
        status: item.status,
        hasRootCauseAnalysis: item.hasRootCauseAnalysis(),
        rootCause: item.rootCause,
        actionPlanId: item.actionPlanId,
        daysOpen: item.daysOpen,
        isOpen: item.isOpen(),
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
      })),
      total: result.total,
      page,
      pageSize,
      filters: { status, severity, processArea },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('GET /api/strategic/anomalies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/anomalies
export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = createAnomalySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Criar entity
    const anomalyResult = Anomaly.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      title: validation.data.title,
      description: validation.data.description,
      source: validation.data.source as AnomalySource,
      sourceEntityId: validation.data.sourceEntityId,
      severity: validation.data.severity as AnomalySeverity,
      processArea: validation.data.processArea,
      responsibleUserId: validation.data.responsibleUserId,
      detectedBy: context.userId,
    });

    if (Result.isFail(anomalyResult)) {
      return NextResponse.json({ error: anomalyResult.error }, { status: 400 });
    }

    const entity = anomalyResult.value;

    // Persistir via repository
    const repository = container.resolve<IAnomalyRepository>(
      STRATEGIC_TOKENS.AnomalyRepository
    );

    const saveResult = await repository.save(entity);

    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({
      id: entity.id,
      code: entity.code,
      title: entity.title,
      status: entity.status,
      severity: entity.severity,
      message: 'Anomalia registrada',
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/strategic/anomalies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
