/**
 * API Routes: /api/strategic/goals
 * CRUD de objetivos estratégicos
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
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
  perspectiveCode: z.string().optional(), // Fallback se ID não for informado
  cascadeLevel: z.enum(['CEO', 'DIRECTOR', 'MANAGER', 'TEAM']),
  code: z.string().min(1, 'Código é obrigatório').max(20),
  baselineValue: z.number().optional(),
  polarity: z.enum(['UP', 'DOWN']).optional(),
  ownerUserId: z.string().uuid().optional(),
  ownerBranchId: z.number().optional(),
  startDate: z.string().datetime().or(z.string().transform((s) => new Date(s).toISOString())),
  dueDate: z.string().datetime().or(z.string().transform((s) => new Date(s).toISOString())),
});

// GET /api/strategic/goals
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    
    // ✅ S1.1 Batch 3: Validar query params com Zod
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = queryGoalsSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { page, pageSize, status, perspectiveId, responsibleId: ownerUserId, startDate, endDate } = validation.data;
    
    // Campos específicos do sistema (não no schema base)
    const parentGoalId = searchParams.get('parentGoalId') ?? undefined;
    const cascadeLevel = searchParams.get('cascadeLevel') ?? undefined;

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
export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    let { perspectiveId, ownerUserId, ownerBranchId } = validation.data;
    const { perspectiveCode, strategyId, ...data } = validation.data;

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
