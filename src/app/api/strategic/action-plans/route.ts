/**
 * API Routes: /api/strategic/action-plans
 * CRUD de planos de ação 5W2H
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateActionPlanUseCase } from '@/modules/strategic/application/commands/CreateActionPlanUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';
import { queryActionPlansSchema, actionPlanStatusSchema, prioritySchema, pdcaPhaseSchema } from '@/lib/validation/strategic-schemas';

// ✅ S1.1 Batch 3: Schema estendido para 5W2H
const createSchema = z.object({
  goalId: z.string().trim().uuid().optional(),
  what: z.string().trim().min(1, 'O que fazer é obrigatório'),
  why: z.string().trim().min(1, 'Por que fazer é obrigatório'),
  whereLocation: z.string().trim().min(1, 'Onde fazer é obrigatório'),
  // ✅ S1.X-BUGFIX: Validar data antes de transformar — retorna Date para o use case
  whenStart: z.string().trim().datetime({ message: 'Data de início inválida (ISO 8601)' }).or(
    z.string().trim().refine(
      (s) => !isNaN(Date.parse(s)),
      { message: 'whenStart deve ser uma data válida' }
    )
  ).transform((s) => new Date(s)),
  whenEnd: z.string().trim().datetime({ message: 'Data de término inválida (ISO 8601)' }).or(
    z.string().trim().refine(
      (s) => !isNaN(Date.parse(s)),
      { message: 'whenEnd deve ser uma data válida' }
    )
  ).transform((s) => new Date(s)),
  who: z.string().trim().min(1, 'Responsável é obrigatório'),
  whoUserId: z.string().trim().uuid('whoUserId deve ser UUID'),
  how: z.string().trim().min(1, 'Como fazer é obrigatório'),
  howMuchAmount: z.number().optional(),
  howMuchCurrency: z.string().trim().length(3).optional(),
  priority: prioritySchema.optional(),
});

// ✅ S1.1 Batch 3: Schema de query
// ⚠️ HOTFIX-2: Usar .merge() ao invés de .extend() pois queryActionPlansSchema tem .refine()
const querySchema = queryActionPlansSchema.merge(z.object({
  goalId: z.string().trim().uuid().optional(),
  whoUserId: z.string().trim().uuid().optional(),
  pdcaCycle: pdcaPhaseSchema.optional(),
  status: actionPlanStatusSchema.optional(),
  priority: prioritySchema.optional(),
  overdueOnly: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
}));

// GET /api/strategic/action-plans
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    const { searchParams } = new URL(request.url);

    // ✅ S1.1 Batch 3: Validar query params
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = querySchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    const filter = {
      organizationId: context.organizationId,
      branchId: context.branchId,
      ...validation.data,
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
export const POST = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

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
