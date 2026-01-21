/**
 * API Routes: /api/strategic/goals
 * CRUD de objetivos estratégicos
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateStrategicGoalUseCase } from '@/modules/strategic/application/commands/CreateStrategicGoalUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import { db } from '@/lib/db';
import { bscPerspectiveTable } from '@/modules/strategic/infrastructure/persistence/schemas/bsc-perspective.schema';
import { eq, and } from 'drizzle-orm';

// Schema de validação
const createGoalSchema = z.object({
  perspectiveId: z.string().uuid('perspectiveId deve ser UUID válido').optional(),
  perspectiveCode: z.string().optional(), // Fallback se ID não for informado
  strategyId: z.string().optional(), // Necessário para resolver perspectiveCode
  parentGoalId: z.string().uuid().optional(),
  code: z.string().min(1, 'Código é obrigatório').max(20),
  description: z.string().min(1, 'Descrição é obrigatória'),
  cascadeLevel: z.enum(['CEO', 'DIRECTOR', 'MANAGER', 'TEAM']),
  targetValue: z.number(),
  baselineValue: z.number().optional(),
  unit: z.string().min(1).max(20),
  polarity: z.enum(['UP', 'DOWN']).optional(),
  weight: z.number().min(0).max(100),
  ownerUserId: z.string().uuid().optional(),
  ownerBranchId: z.number().optional(),
  startDate: z.string().transform((s) => new Date(s)),
  dueDate: z.string().transform((s) => new Date(s)),
});

// GET /api/strategic/goals
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const perspectiveId = searchParams.get('perspectiveId') ?? undefined;
    const parentGoalId = searchParams.get('parentGoalId') ?? undefined;
    const cascadeLevel = searchParams.get('cascadeLevel') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const ownerUserId = searchParams.get('ownerUserId') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

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
}

// POST /api/strategic/goals
export async function POST(request: NextRequest) {
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
}
