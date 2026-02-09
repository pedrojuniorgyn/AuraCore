/**
 * API Route: /api/strategic/ideas/[id]/convert
 * POST - Convert idea to action-plan, goal, kpi, or pdca
 * 
 * @module app/api/strategic/ideas/[id]/convert
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IConvertIdeaUseCase } from '@/modules/strategic/domain/ports/input/IConvertIdeaUseCase';
import type { IIdeaBoxRepository } from '@/modules/strategic/domain/ports/output/IIdeaBoxRepository';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import { StrategicGoal } from '@/modules/strategic/domain/entities/StrategicGoal';
import { KPI } from '@/modules/strategic/domain/entities/KPI';
import { Result } from '@/shared/domain';
import { CascadeLevel } from '@/modules/strategic/domain/value-objects/CascadeLevel';
import { db } from '@/lib/db';
import { bscPerspectiveTable } from '@/modules/strategic/infrastructure/persistence/schemas/bsc-perspective.schema';
import { eq, and } from 'drizzle-orm';

const convertIdeaSchema = z.object({
  targetType: z.enum(['ACTION_PLAN', 'GOAL', 'KPI', 'PDCA']),
  // Campos opcionais para ACTION_PLAN (5W2H)
  goalId: z.string().uuid().optional(),
  whereLocation: z.string().optional(),
  whenStart: z.string().datetime().optional(),
  whenEnd: z.string().datetime().optional(),
  who: z.string().optional(),
  whoUserId: z.string().optional(),
  how: z.string().optional(),
  howMuchAmount: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  // Campos opcionais para GOAL
  perspectiveId: z.string().uuid().optional(),
  // Campos opcionais para KPI
  metricUnit: z.string().optional(),
  targetValue: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    let tenantCtx;
    try {
      tenantCtx = await getTenantContext();
    } catch (error: unknown) {
      if (error instanceof Response) return error;
      throw error;
    }

    const { id } = await context.params;
    const body = await request.json();
    
    // Validar payload
    const validation = convertIdeaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { targetType, ...options } = validation.data;

    // Buscar idea
    const ideaRepo = container.resolve<IIdeaBoxRepository>(
      STRATEGIC_TOKENS.IdeaBoxRepository
    );
    
    const idea = await ideaRepo.findById(
      id,
      tenantCtx.organizationId,
      tenantCtx.branchId
    );

    if (!idea) {
      return NextResponse.json(
        { success: false, error: 'Idea not found' },
        { status: 404 }
      );
    }

    // Validar que a ideia pode ser convertida
    if (idea.status.value !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only approved ideas can be converted',
          details: { status: ['Apenas ideias aprovadas podem ser convertidas'] },
        },
        { status: 400 }
      );
    }

    // Converter baseado no tipo
    let convertedId: string;
    let redirectUrl: string;

    switch (targetType) {
      case 'ACTION_PLAN': {
        const result = await convertToActionPlan(idea, tenantCtx, options);
        if (Result.isFail(result)) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }
        convertedId = result.value;
        redirectUrl = `/strategic/action-plans/${convertedId}`;
        break;
      }

      case 'GOAL': {
        const result = await convertToGoal(idea, tenantCtx, options);
        if (Result.isFail(result)) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }
        convertedId = result.value;
        redirectUrl = `/strategic/goals/${convertedId}`;
        break;
      }

      case 'KPI': {
        const result = await convertToKpi(idea, tenantCtx, options);
        if (Result.isFail(result)) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }
        convertedId = result.value;
        redirectUrl = `/strategic/kpis/${convertedId}`;
        break;
      }

      case 'PDCA': {
        return NextResponse.json(
          {
            success: false,
            error: 'PDCA conversion not implemented yet',
            details: { targetType: ['Conversão para PDCA ainda não implementada'] },
          },
          { status: 501 }
        );
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid target type' },
          { status: 400 }
        );
    }

    // Marcar idea como convertida
    const convertResult = idea.convert(targetType, convertedId);
    if (Result.isFail(convertResult)) {
      return NextResponse.json(
        { success: false, error: convertResult.error },
        { status: 500 }
      );
    }

    await ideaRepo.save(idea);

    return NextResponse.json({
      success: true,
      id: convertedId,
      redirectUrl,
      targetType,
    });
  } catch (error) {
    console.error('[POST /api/strategic/ideas/[id]/convert] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert idea' },
      { status: 500 }
    );
  }
}

// Helper: Converter para Action Plan (usa Use Case existente)
async function convertToActionPlan(
  idea: { id: string; title: string; description: string; importance: string; estimatedCost: number | null; estimatedCostCurrency: string },
  tenantCtx: { organizationId: number; branchId: number; userId: string },
  options: { goalId?: string; whereLocation?: string; whenStart?: string; whenEnd?: string; who?: string; whoUserId?: string; how?: string; howMuchAmount?: number; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }
): Promise<Result<string, string>> {
  try {
    const useCase = container.resolve<IConvertIdeaUseCase>(
      STRATEGIC_TOKENS.ConvertIdeaUseCase
    );

    const result = await useCase.execute({
      ideaId: idea.id,
      organizationId: tenantCtx.organizationId,
      branchId: tenantCtx.branchId,
      goalId: options.goalId,
      whereLocation: options.whereLocation || 'A definir',
      whenStart: options.whenStart ? new Date(options.whenStart) : new Date(),
      whenEnd: options.whenEnd 
        ? new Date(options.whenEnd) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
      who: options.who || 'A definir',
      whoUserId: options.whoUserId || tenantCtx.userId,
      how: options.how || 'A definir',
      howMuchAmount: options.howMuchAmount,
      priority: options.priority || (idea.importance === 'HIGH' ? 'HIGH' : 'MEDIUM'),
      convertedBy: tenantCtx.userId,
    });

    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    return Result.ok(result.value.id);
  } catch (error) {
    console.error('[convertToActionPlan] Error:', error);
    return Result.fail('Failed to convert to action plan');
  }
}

// Helper: Converter para Goal
async function convertToGoal(
  idea: { id: string; title: string; description: string; category: string | null },
  tenantCtx: { organizationId: number; branchId: number; userId: string },
  options: { perspectiveId?: string; targetValue?: number }
): Promise<Result<string, string>> {
  try {
    const repo = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    // Resolver perspectiveId: se não fornecido, buscar da estratégia ativa
    let perspectiveId = options.perspectiveId;

    if (!perspectiveId) {
      const strategyRepo = container.resolve<IStrategyRepository>(
        STRATEGIC_TOKENS.StrategyRepository
      );

      const activeStrategy = await strategyRepo.findActive(
        tenantCtx.organizationId,
        tenantCtx.branchId
      );

      if (!activeStrategy) {
        return Result.fail('Nenhuma estratégia ativa encontrada. Crie uma estratégia antes de converter ideias em objetivos.');
      }

      // Buscar perspectiva "Processos Internos" (INT) como padrão para ideias
      // Fallback: primeira perspectiva disponível
      const perspectives = await db
        .select({ id: bscPerspectiveTable.id, code: bscPerspectiveTable.code })
        .from(bscPerspectiveTable)
        .where(eq(bscPerspectiveTable.strategyId, activeStrategy.id));

      if (perspectives.length === 0) {
        return Result.fail('Nenhuma perspectiva BSC encontrada na estratégia ativa. Configure as perspectivas antes de converter.');
      }

      // Preferir INT (Processos Internos), fallback para primeira disponível
      const internalPerspective = perspectives.find(p => p.code === 'INT');
      perspectiveId = internalPerspective?.id ?? perspectives[0].id;
    }

    // Gerar código temporário (formato: GOAL-YYYYMMDD-NNNN)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const code = `GOAL-${dateStr}-${randomStr}`;

    // Determinar cascade level (MANAGER por padrão para ideias)
    const cascadeLevel = CascadeLevel.MANAGER;

    // Criar Goal baseado na ideia
    const goalResult = StrategicGoal.create({
      organizationId: tenantCtx.organizationId,
      branchId: tenantCtx.branchId,
      code,
      description: idea.title,
      perspectiveId,
      cascadeLevel,
      targetValue: options.targetValue || 100,
      baselineValue: 0,
      unit: 'unidade',
      polarity: 'UP' as const,
      weight: 1,
      ownerUserId: tenantCtx.userId,
      ownerBranchId: tenantCtx.branchId,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // +90 dias
      createdBy: tenantCtx.userId,
    });

    if (Result.isFail(goalResult)) {
      return Result.fail(goalResult.error);
    }

    const goal = goalResult.value;
    await repo.save(goal);

    return Result.ok(goal.id);
  } catch (error) {
    console.error('[convertToGoal] Error:', error);
    return Result.fail('Failed to convert to goal');
  }
}

// Helper: Converter para KPI
async function convertToKpi(
  idea: { id: string; title: string; description: string; category: string | null },
  tenantCtx: { organizationId: number; branchId: number; userId: string; userName?: string },
  options: { metricUnit?: string; targetValue?: number }
): Promise<Result<string, string>> {
  try {
    const repo = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );

    // Gerar código temporário (formato: KPI-YYYYMMDD-NNNN)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const code = `KPI-${dateStr}-${randomStr}`;

    const targetValue = options.targetValue || 100;

    // Criar KPI baseado na ideia
    const kpiResult = KPI.create({
      organizationId: tenantCtx.organizationId,
      branchId: tenantCtx.branchId,
      code,
      name: idea.title,
      description: idea.description,
      unit: options.metricUnit || 'unidade',
      frequency: 'MONTHLY' as const,
      polarity: 'UP' as const, // KPI polarity é 'UP' ou 'DOWN'
      baselineValue: 0,
      targetValue,
      alertThreshold: targetValue * 0.7,
      criticalThreshold: targetValue * 0.5,
      goalId: undefined, // KPI não vinculado inicialmente
      ownerUserId: tenantCtx.userId,
      createdBy: tenantCtx.userId,
    });

    if (Result.isFail(kpiResult)) {
      return Result.fail(kpiResult.error);
    }

    const kpi = kpiResult.value;
    await repo.save(kpi);

    return Result.ok(kpi.id);
  } catch (error) {
    console.error('[convertToKpi] Error:', error);
    return Result.fail('Failed to convert to KPI');
  }
}
