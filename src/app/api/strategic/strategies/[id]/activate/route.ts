/**
 * API Route: /api/strategic/strategies/[id]/activate
 * Ativa uma estratégia
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { ActivateStrategyUseCase } from '@/modules/strategic/application/commands/ActivateStrategyUseCase';
import { z } from 'zod';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
const idSchema = z.string().trim().uuid('Invalid strategy id');

// POST /api/strategic/strategies/[id]/activate
export const POST = withDI(async (
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
      return NextResponse.json({ error: 'Invalid strategy id' }, { status: 400 });
    }

    const useCase = container.resolve(ActivateStrategyUseCase);
    const result = await useCase.execute({ strategyId: idResult.data }, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Estratégia ativada com sucesso',
      strategyId: id
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/strategic/strategies/[id]/activate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
