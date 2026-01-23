/**
 * API Routes: /api/strategic/action-plans
 * CRUD de planos de ação 5W2H
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateActionPlanUseCase } from '@/modules/strategic/application/commands/CreateActionPlanUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';

const createSchema = z.object({
  goalId: z.string().uuid().optional(),
  what: z.string().min(1, 'O que fazer é obrigatório'),
  why: z.string().min(1, 'Por que fazer é obrigatório'),
  whereLocation: z.string().min(1, 'Onde fazer é obrigatório'),
  whenStart: z.string().transform((s) => new Date(s)),
  whenEnd: z.string().transform((s) => new Date(s)),
  who: z.string().min(1, 'Responsável é obrigatório'),
  whoUserId: z.string().uuid('whoUserId deve ser UUID'),
  how: z.string().min(1, 'Como fazer é obrigatório'),
  howMuchAmount: z.number().optional(),
  howMuchCurrency: z.string().length(3).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

// GET /api/strategic/action-plans
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();
    const { searchParams } = new URL(request.url);

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    const filter = {
      organizationId: context.organizationId,
      branchId: context.branchId,
      goalId: searchParams.get('goalId') ?? undefined,
      whoUserId: searchParams.get('whoUserId') ?? undefined,
      pdcaCycle: searchParams.get('pdcaCycle') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      overdueOnly: searchParams.get('overdueOnly') === 'true',
      page: parseInt(searchParams.get('page') ?? '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') ?? '20', 10),
    };

    const { items, total } = await repository.findMany(filter);

    return NextResponse.json({
      items: items.map((plan) => ({
        id: plan.id,
        code: plan.code,
        what: plan.what,
        why: plan.why,
        whereLocation: plan.whereLocation,
        whenStart: plan.whenStart.toISOString(),
        whenEnd: plan.whenEnd.toISOString(),
        who: plan.who,
        whoUserId: plan.whoUserId,
        how: plan.how,
        howMuchAmount: plan.howMuchAmount,
        howMuchCurrency: plan.howMuchCurrency,
        pdcaCycle: plan.pdcaCycle.value,
        completionPercent: plan.completionPercent,
        priority: plan.priority,
        status: plan.status,
        isOverdue: plan.isOverdue,
        goalId: plan.goalId,
        parentActionPlanId: plan.parentActionPlanId,
        repropositionNumber: plan.repropositionNumber,
      })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/action-plans error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/action-plans
export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(CreateActionPlanUseCase);
    const result = await useCase.execute(validation.data, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/action-plans error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
