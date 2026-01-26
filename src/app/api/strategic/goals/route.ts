/**
 * API Routes: /api/strategic/goals
 * CRUD de objetivos estratégicos
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateStrategicGoalUseCase } from '@/modules/strategic/application/commands/CreateStrategicGoalUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import { db } from '@/lib/db';
import { bscPerspectiveTable } from '@/modules/strategic/infrastructure/persistence/schemas/bsc-perspective.schema';
import { eq, and } from 'drizzle-orm';
import { createGoalSchema as baseCreateGoalSchema, queryGoalsSchema } from '@/lib/validation/strategic-schemas';

// ✅ S1.1 Batch 3: Schema estendido para compatibilidade com estrutura existente
// Mantém campos específicos do sistema (perspectiveCode, cascadeLevel) + base do strategic-schemas.ts
const createGoalSchema = baseCreateGoalSchema.extend({
  perspectiveId: z.string().trim().uuid().optional(),
  strategyId: z.string().trim().uuid('ID da estratégia inválido'),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  perspective: baseCreateGoalSchema.shape.perspective,
  perspectiveCode: z.string().trim().optional(), // Fallback se ID não for informado
  cascadeLevel: z.enum(['CEO', 'DIRECTOR', 'MANAGER', 'TEAM']),
  code: z.string().trim().min(1, 'Código é obrigatório').max(20),
  baselineValue: z.number().optional(),
  polarity: z.enum(['UP', 'DOWN']).optional(),
  ownerUserId: z.string().trim().uuid().optional(),
  ownerBranchId: z.number().optional(),
  // ✅ S1.X-BUGFIX: Validar data antes de transform (Bug 4)
  startDate: z.string().trim().datetime().or(
    z.string().trim().refine(
      (s) => !isNaN(Date.parse(s)),
      { message: 'startDate deve ser uma data válida' }
    )
  ).transform((s) => new Date(s)),
  dueDate: z.string().trim().datetime().or(
    z.string().trim().refine(
      (s) => !isNaN(Date.parse(s)),
      { message: 'dueDate deve ser uma data válida' }
    )
  ).transform((s) => new Date(s)),
});

const goalsQuerySchema = queryGoalsSchema.and(z.object({
  perspectiveId: z.string().trim().uuid().optional(),
  parentGoalId: z.string().trim().uuid().optional(),
  cascadeLevel: z.string().trim().optional(),
}));

// GET /api/strategic/goals
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // ✅ S1.1 Batch 3: Validar query params com Zod
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = goalsQuerySchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const {
      page,
      pageSize,
      status,
      perspectiveId,
      responsibleId: ownerUserId,
      parentGoalId,
      cascadeLevel,
    } = validation.data;

    const repository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      perspectiveId,
      parentGoalId,
      cascadeLevel,
      status,
      ownerUserId,
      page,
      pageSize,
    });

    return NextResponse.json({
      items: result.items.map((g) => ({
        id: g.id,
        perspectiveId: g.perspectiveId,
        parentGoalId: g.parentGoalId,
        code: g.code,
        description: g.description,
        cascadeLevel: g.cascadeLevel.value,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        baselineValue: g.baselineValue,
        unit: g.unit,
        polarity: g.polarity,
        weight: g.weight,
        ownerUserId: g.ownerUserId,
        ownerBranchId: g.ownerBranchId,
        status: g.status.value,
        statusColor: g.status.color,
        progress: g.progress,
        mapPositionX: g.mapPositionX,
        mapPositionY: g.mapPositionY,
        startDate: g.startDate.toISOString(),
        dueDate: g.dueDate.toISOString(),
        createdAt: g.createdAt.toISOString(),
      })),
      total: result.total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/goals error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/goals
export const POST = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = createGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    let { perspectiveId, ownerUserId, ownerBranchId } = validation.data;
    const { perspectiveCode, strategyId, description, ...data } = validation.data;
    const ensuredDescription = description ?? '';

    // Resolver ownerUserId se não informado
    if (!ownerUserId) {
      ownerUserId = context.userId;
    }
    
    // Resolver ownerBranchId se não informado
    if (!ownerBranchId) {
      ownerBranchId = context.branchId;
    }

    // Resolver perspectiveId se não informado
    if (!perspectiveId && perspectiveCode && strategyId) {
      const perspective = await db
        .select()
        .from(bscPerspectiveTable)
        .where(
          and(
            eq(bscPerspectiveTable.strategyId, strategyId),
            eq(bscPerspectiveTable.code, perspectiveCode)
          )
        );
      
      if (perspective.length > 0) {
        perspectiveId = perspective[0].id;
      } else {
        return NextResponse.json(
          { error: `Perspectiva não encontrada para código ${perspectiveCode} e estratégia ${strategyId}` },
          { status: 400 }
        );
      }
    }

    if (!perspectiveId) {
      return NextResponse.json(
        { error: 'perspectiveId é obrigatório ou par perspectiveCode/strategyId' },
        { status: 400 }
      );
    }

    const useCase = container.resolve(CreateStrategicGoalUseCase);
    const result = await useCase.execute({
      ...data,
      description: ensuredDescription,
      perspectiveId,
      ownerUserId,
      ownerBranchId
    }, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/goals error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
