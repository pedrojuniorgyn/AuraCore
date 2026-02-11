/**
 * API Routes: /api/strategic/anomalies/[id]/resolve
 * Resolver anomalia
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

const resolveSchema = z.object({
  resolution: z.string().min(1, 'Resolução é obrigatória'),
});

// POST /api/strategic/anomalies/[id]/resolve
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

    const body = await request.json();
    const validation = resolveSchema.safeParse(body);

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

    // Resolver anomalia
    const resolveResult = anomaly.resolve(
      validation.data.resolution,
      context.userId
    );

    if (Result.isFail(resolveResult)) {
      return NextResponse.json({ error: resolveResult.error }, { status: 400 });
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
      resolution: anomaly.resolution,
      resolvedAt: anomaly.resolvedAt?.toISOString(),
      resolvedBy: anomaly.resolvedBy,
      daysOpen: anomaly.daysOpen,
      message: 'Anomalia resolvida',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/strategic/anomalies/[id]/resolve error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
