/**
 * API: PUT /api/strategic/kpis/[id]/value
 * Atualiza valor do KPI
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { UpdateKPIValueUseCase } from '@/modules/strategic/application/commands/UpdateKPIValueUseCase';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
const idSchema = z.string().trim().uuid('Invalid kpi id');
const updateValueSchema = z.object({
  value: z.number(),
  periodDate: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'periodDate inválida' })
    .transform((s) => new Date(s))
    .optional(),
});

export const PUT = withDI(async (
  request: Request,
  routeCtx: RouteContext
) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await routeCtx.params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid kpi id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const validation = updateValueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(UpdateKPIValueUseCase);
    const result = await useCase.execute(
      {
        kpiId: idResult.data,
        value: validation.data.value,
        periodDate: validation.data.periodDate,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('PUT /api/strategic/kpis/[id]/value error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
