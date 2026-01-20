/**
 * API Routes: /api/strategic/swot
 * CRUD de análises SWOT
 * 
 * @module app/api/strategic/swot
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateSwotItemCommand } from '@/modules/strategic/application/commands/CreateSwotItemCommand';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { ISwotAnalysisRepository } from '@/modules/strategic/domain/ports/output/ISwotAnalysisRepository';
import type { SwotQuadrant, SwotCategory, SwotStatus } from '@/modules/strategic/domain/entities/SwotItem';

const createSWOTItemSchema = z.object({
  quadrant: z.enum(['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT']),
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().optional(),
  impactScore: z.number().min(1).max(5).default(3),
  probabilityScore: z.number().min(1).max(5).default(3),
  category: z.string().max(50).optional(),
  strategyId: z.string().uuid().optional(),
});

// GET /api/strategic/swot
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();
    const { searchParams } = new URL(request.url);

    const strategyId = searchParams.get('strategyId') ?? undefined;
    const quadrant = (searchParams.get('quadrant') ?? undefined) as SwotQuadrant | undefined;
    const status = (searchParams.get('status') ?? undefined) as SwotStatus | undefined;
    const category = (searchParams.get('category') ?? undefined) as SwotCategory | undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const repository = container.resolve<ISwotAnalysisRepository>(
      STRATEGIC_TOKENS.SwotAnalysisRepository
    );

    const { items, total } = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      strategyId,
      quadrant,
      status,
      category,
      page,
      pageSize,
    });

    // Calcular resumo por quadrante
    const allItems = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      strategyId,
      page: 1,
      pageSize: 500,
    });

    const summary = {
      strengths: { count: 0, avgScore: 0, totalScore: 0 },
      weaknesses: { count: 0, avgScore: 0, totalScore: 0 },
      opportunities: { count: 0, avgScore: 0, totalScore: 0 },
      threats: { count: 0, avgScore: 0, totalScore: 0 },
    };

    for (const item of allItems.items) {
      const key = item.quadrant.toLowerCase() + 's' as keyof typeof summary;
      if (key in summary) {
        summary[key].count++;
        summary[key].totalScore += item.priorityScore;
      }
    }

    // Calcular médias
    for (const key of Object.keys(summary) as Array<keyof typeof summary>) {
      if (summary[key].count > 0) {
        summary[key].avgScore = Math.round(
          (summary[key].totalScore / summary[key].count) * 100
        ) / 100;
      }
    }

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        strategyId: item.strategyId,
        quadrant: item.quadrant,
        title: item.title,
        description: item.description,
        impactScore: item.impactScore,
        probabilityScore: item.probabilityScore,
        priorityScore: item.priorityScore,
        category: item.category,
        status: item.status,
        convertedToActionPlanId: item.convertedToActionPlanId,
        convertedToGoalId: item.convertedToGoalId,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      summary: {
        strengths: { count: summary.strengths.count, avgScore: summary.strengths.avgScore },
        weaknesses: { count: summary.weaknesses.count, avgScore: summary.weaknesses.avgScore },
        opportunities: { count: summary.opportunities.count, avgScore: summary.opportunities.avgScore },
        threats: { count: summary.threats.count, avgScore: summary.threats.avgScore },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/swot error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/swot
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createSWOTItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(CreateSwotItemCommand);
    const result = await useCase.execute(
      {
        strategyId: validation.data.strategyId,
        quadrant: validation.data.quadrant,
        title: validation.data.title,
        description: validation.data.description,
        impactScore: validation.data.impactScore,
        probabilityScore: validation.data.probabilityScore,
        category: validation.data.category as SwotCategory | undefined,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/swot error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
