/**
 * API Routes: /api/strategic/kpis
 * GET - Lista KPIs
 * POST - Cria novo KPI
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateKPIUseCase } from '@/modules/strategic/application/commands/CreateKPIUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';

const createKPISchema = z.object({
  goalId: z.string().uuid().optional(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  unit: z.string().min(1).max(20),
  polarity: z.enum(['UP', 'DOWN']).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  targetValue: z.number(),
  baselineValue: z.number().optional(),
  alertThreshold: z.number().optional(),
  criticalThreshold: z.number().optional(),
  autoCalculate: z.boolean().optional(),
  sourceModule: z.string().optional(),
  sourceQuery: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
});

// GET /api/strategic/kpis
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const ownerUserId = searchParams.get('ownerUserId') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const repository = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      goalId,
      status,
      ownerUserId,
      page,
      pageSize,
    });

    return NextResponse.json({
      items: result.items.map((kpi) => ({
        id: kpi.id,
        goalId: kpi.goalId,
        code: kpi.code,
        name: kpi.name,
        description: kpi.description,
        unit: kpi.unit,
        polarity: kpi.polarity,
        frequency: kpi.frequency,
        targetValue: kpi.targetValue,
        currentValue: kpi.currentValue,
        baselineValue: kpi.baselineValue,
        status: kpi.status,
        achievementPercent: kpi.achievementPercent,
        deviationPercent: kpi.deviationPercent,
        autoCalculate: kpi.autoCalculate,
        sourceModule: kpi.sourceModule,
        lastCalculatedAt: kpi.lastCalculatedAt,
        ownerUserId: kpi.ownerUserId,
      })),
      total: result.total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/kpis error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/kpis
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createKPISchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const input = {
      ...validation.data,
      ownerUserId: validation.data.ownerUserId || context.userId,
    };

    const useCase = container.resolve(CreateKPIUseCase);
    const result = await useCase.execute(input, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/kpis error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
