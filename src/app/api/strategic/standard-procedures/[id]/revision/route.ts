/**
 * API Routes: /api/strategic/standard-procedures/[id]/revision
 * Criar nova revisão do procedimento
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

const createRevisionSchema = z.object({
  solution: z.string().optional(),
  standardOperatingProcedure: z.string().optional(),
  rootCause: z.string().optional(),
  nextReviewDate: z.string().datetime().transform((s) => new Date(s)).optional(),
});

// POST /api/strategic/standard-procedures/[id]/revision
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
    const validation = createRevisionSchema.safeParse(body);

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

    // Se não está em revisão, iniciar revisão primeiro
    if (procedure.status === 'ACTIVE') {
      const startReviewResult = procedure.startReview();
      if (Result.isFail(startReviewResult)) {
        return NextResponse.json({ error: startReviewResult.error }, { status: 400 });
      }
    }

    // Criar nova versão
    const newVersionResult = procedure.createNewVersion({
      solution: validation.data.solution,
      standardOperatingProcedure: validation.data.standardOperatingProcedure,
      rootCause: validation.data.rootCause,
      nextReviewDate: validation.data.nextReviewDate,
    });

    if (Result.isFail(newVersionResult)) {
      return NextResponse.json({ error: newVersionResult.error }, { status: 400 });
    }

    // Persistir
    await repository.save(procedure);

    return NextResponse.json({
      id: procedure.id,
      code: procedure.code,
      title: procedure.title,
      status: procedure.status,
      version: procedure.version,
      lastReviewDate: procedure.lastReviewDate?.toISOString(),
      nextReviewDate: procedure.nextReviewDate?.toISOString() ?? null,
      message: 'Nova revisão criada',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/strategic/standard-procedures/[id]/revision error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
