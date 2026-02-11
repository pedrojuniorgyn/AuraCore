/**
 * API: POST /api/strategic/goals/[id]/cascade
 * Desdobra meta para nível inferior
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CascadeGoalUseCase } from '@/modules/strategic/application/commands/CascadeGoalUseCase';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
const idSchema = z.string().trim().uuid();

const cascadeSchema = z.object({
  children: z.array(z.object({
    code: z.string().trim().min(1, 'Código é obrigatório').max(20),
    description: z.string().trim().min(1, 'Descrição é obrigatória'),
    targetValue: z.number(),
    weight: z.number().min(0).max(100),
    ownerUserId: z.string().trim().uuid('ownerUserId deve ser UUID válido'),
    ownerBranchId: z.number(),
    dueDate: z
      .string()
      .trim()
      .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'dueDate inválida' })
      .transform((s) => new Date(s)),
  })).min(1, 'É necessário informar pelo menos uma meta filha'),
});

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
      return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const validation = cascadeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(CascadeGoalUseCase);
    const result = await useCase.execute(
      {
        parentGoalId: idResult.data,
        children: validation.data.children,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/strategic/goals/[id]/cascade error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
