/**
 * API Routes: /api/strategic/anomalies/[id]/analyze
 * Registrar análise de causa raiz (5 Porquês)
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
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
registerStrategicModule();

const uuidSchema = z.string().uuid();

const analyzeSchema = z.object({
  why1: z.string().trim().min(1, 'Primeiro "porquê" é obrigatório').max(500),
  why2: z.string().trim().min(1, 'Segundo "porquê" é obrigatório').max(500),
  why3: z.string().trim().max(500).optional(),
  why4: z.string().trim().max(500).optional(),
  why5: z.string().trim().max(500).optional(),
  rootCause: z.string().trim().max(500).optional(),
});

// POST /api/strategic/anomalies/[id]/analyze
export const POST = withDI(async (
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

    const validation = analyzeSchema.safeParse(body);

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

    // Registrar análise de causa raiz
    const analyzeResult = anomaly.registerRootCauseAnalysis(
      validation.data.why1,
      validation.data.why2,
      validation.data.why3,
      validation.data.why4,
      validation.data.why5,
      validation.data.rootCause
    );

    if (Result.isFail(analyzeResult)) {
      return NextResponse.json({ error: analyzeResult.error }, { status: 400 });
    }

    // Persistir
    const saveResult = await repository.save(anomaly);

    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({
      id: anomaly.id,
      code: anomaly.code,
      status: anomaly.status,
      rootCauseAnalysis: anomaly.rootCauseAnalysis,
      why1: anomaly.why1,
      why2: anomaly.why2,
      why3: anomaly.why3,
      why4: anomaly.why4,
      why5: anomaly.why5,
      rootCause: anomaly.rootCause,
      message: 'Análise de causa raiz registrada',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/strategic/anomalies/[id]/analyze error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
