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
import type { ActionPlanStatus } from '@/modules/strategic/domain/entities/ActionPlan';
import { queryActionPlansSchema, actionPlanStatusSchema, prioritySchema, pdcaPhaseSchema } from '@/lib/validation/strategic-schemas';

// ✅ S1.1 Batch 3: Schema estendido para 5W2H
const createSchema = z.object({
  goalId: z.string().trim().uuid().optional(),
  what: z.string().trim().min(1, 'Field "what" is required'),
  why: z.string().trim().min(1, 'Field "why" is required'),
  whereLocation: z.string().trim().min(1).optional(),
  // ✅ S1.X-BUGFIX: Validar data antes de transformar — retorna Date para o use case
  whenStart: z.string().trim().datetime({ message: 'Invalid start date (ISO 8601)' }).or(
    z.string().trim().refine(
      (s) => !isNaN(Date.parse(s)),
      { message: 'whenStart must be a valid date' }
    )
  ).transform((s) => new Date(s)),
  whenEnd: z.string().trim().datetime({ message: 'Invalid end date (ISO 8601)' }).or(
    z.string().trim().refine(
      (s) => !isNaN(Date.parse(s)),
      { message: 'whenEnd must be a valid date' }
    )
  ).transform((s) => new Date(s)),
  who: z.string().trim().min(1, 'Field "who" is required'),
  whoUserId: z.string().trim().uuid().or(z.string().trim().min(1)).optional(),
  whoType: z.enum(['USER', 'EMAIL', 'PARTNER']).default('USER'),
  whoEmail: z.string().email().optional(),
  whoPartnerId: z.string().optional(),
  how: z.string().trim().min(1, 'Field "how" is required'),
  howMuchAmount: z.number().optional(),
  howMuchCurrency: z.string().trim().length(3).default('BRL'),
  priority: prioritySchema.default('MEDIUM'),
}).refine((data) => {
  // Validar consistência whoType - EMAIL requer whoEmail
  if (data.whoType === 'EMAIL' && !data.whoEmail) {
    return false;
  }
  return true;
}, {
  message: 'whoEmail é obrigatório quando whoType é EMAIL',
  path: ['whoEmail'],
}).refine((data) => {
  // Validar consistência whoType - PARTNER requer whoPartnerId
  if (data.whoType === 'PARTNER' && !data.whoPartnerId) {
    return false;
  }
  return true;
}, {
  message: 'whoPartnerId é obrigatório quando whoType é PARTNER',
  path: ['whoPartnerId'],
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

const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
};

const normalizeStatus = (
  status: ActionPlanStatus,
  pdcaCycle: string
): ActionPlanStatus => {
  if (status === 'DRAFT') {
    if (pdcaCycle === 'PLAN') {
      return 'PENDING';
    }
    if (pdcaCycle === 'DO' || pdcaCycle === 'CHECK' || pdcaCycle === 'ACT') {
      return 'IN_PROGRESS';
    }
  }
  return status;
};

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
          error: 'Invalid query parameters',
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
        status: normalizeStatus(plan.status, plan.pdcaCycle.value),
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

    const body = await safeJson<unknown>(request);

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
