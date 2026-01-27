/**
 * API Routes: /api/strategic/swot
 * CRUD de análises SWOT
 *
 * @module app/api/strategic/swot
 */
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateSwotItemCommand } from '@/modules/strategic/application/commands/CreateSwotItemCommand';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { ISwotAnalysisRepository } from '@/modules/strategic/domain/ports/output/ISwotAnalysisRepository';
import type { SwotQuadrant, SwotCategory, SwotStatus } from '@/modules/strategic/domain/entities/SwotItem';

const swotQuadrants = ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT'] as const;
const isSwotQuadrant = (value: string | undefined): value is SwotQuadrant =>
  !!value && swotQuadrants.includes(value as SwotQuadrant);

const createSWOTItemSchema = z
  .object({
    quadrant: z.enum(swotQuadrants).optional(),
    type: z.string().trim().optional(),
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).optional(),
    impactScore: z.number().min(1).max(5).default(3),

    /**
     * NOTE:
     * - Accept 0..5 at the route boundary (UI may send 0).
     * - Keep default = 3 when omitted (do not change effective default).
     * - Coerce < 1 to 1 before hitting use case (use case requires min(1)).
     */
    probabilityScore: z.number().min(0).max(5).optional().default(3),

    category: z.string().trim().max(50).optional(),
    strategyId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const typeUpper = data.type?.toUpperCase();
    const resolvedQuadrant = data.quadrant ?? (isSwotQuadrant(typeUpper) ? typeUpper : undefined);
    if (!resolvedQuadrant) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quadrant'],
        message: 'Quadrant is required',
      });
    }
  });

// GET /api/strategic/swot
export const GET = withDI(async (request: Request) => {
  try {
    let context;
    try {
      context = await getTenantContext();
    } catch (error: unknown) {
      // Preserve upstream tenant errors (401/400/500) instead of masking to 401.
      if (error instanceof Response) return error;
      throw error;
    }

    const { searchParams } = new URL(request.url);

    const strategyId = searchParams.get('strategyId') ?? undefined;
    const quadrant = (searchParams.get('quadrant') ?? undefined) as SwotQuadrant | undefined;
    const status = (searchParams.get('status') ?? undefined) as SwotStatus | undefined;
    const category = (searchParams.get('category') ?? undefined) as SwotCategory | undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const repository = container.resolve<ISwotAnalysisRepository>(STRATEGIC_TOKENS.SwotAnalysisRepository);

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
      const key = (item.quadrant.toLowerCase() + 's') as keyof typeof summary;
      if (key in summary) {
        summary[key].count++;
        summary[key].totalScore += item.priorityScore;
      }
    }

    // Calcular médias
    for (const key of Object.keys(summary) as Array<keyof typeof summary>) {
      if (summary[key].count > 0) {
        summary[key].avgScore = Math.round((summary[key].totalScore / summary[key].count) * 100) / 100;
      }
    }

    return Response.json({
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
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/swot
const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
};

export const POST = withDI(async (request: Request) => {
  try {
    let context;
    try {
      context = await getTenantContext();
    } catch (error: unknown) {
      // Preserve upstream tenant errors (401/400/500) instead of masking to 401.
      if (error instanceof Response) return error;
      throw error;
    }

    const validation = createSWOTItemSchema.safeParse(await safeJson<unknown>(request));

    if (!validation.success) {
      return Response.json({ error: 'Invalid request payload', details: validation.error.flatten() }, { status: 400 });
    }

    // IMPORTANT: Coerce ALL values < 1 (e.g., 0, 0.5) to 1 before the use case.
    // Keep default=3 when omitted (schema already defaults to 3).
    const normalizedProbabilityScore =
      validation.data.probabilityScore < 1 ? 1 : validation.data.probabilityScore;

    const useCase = container.resolve(CreateSwotItemCommand);
    const result = await useCase.execute(
      {
        strategyId: validation.data.strategyId,
        quadrant: validation.data.quadrant as SwotQuadrant, // guaranteed via superRefine
        title: validation.data.title,
        description: validation.data.description,
        impactScore: validation.data.impactScore,
        probabilityScore: normalizedProbabilityScore,
        category: validation.data.category as SwotCategory | undefined,
      },
      context
    );

    if (Result.isFail(result)) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/swot error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});