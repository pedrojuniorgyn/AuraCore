/**
 * API Routes: /api/strategic/kpis
 * GET - Lista KPIs
 * POST - Cria novo KPI
 * 
 * Cache (GET):
 * - TTL: 5 minutos (CacheTTL.SHORT)
 * - Key: org:{organizationId}:branch:{branchId}:filters:{hash}
 * - Prefix: kpis:
 * - Invalidação: POST/PUT/DELETE em /api/strategic/kpis
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateKPIUseCase } from '@/modules/strategic/application/commands/CreateKPIUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import { CacheService, CacheTTL } from '@/services/cache.service';

const createKPISchema = z.object({
  goalId: z.string().trim().uuid().optional(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().optional(),
  unit: z.string().trim().min(1).max(20),
  polarity: z.enum(['UP', 'DOWN']).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  targetValue: z.number(),
  baselineValue: z.number().optional(),
  alertThreshold: z.number().optional(),
  criticalThreshold: z.number().optional(),
  autoCalculate: z.boolean().optional(),
  sourceModule: z.string().trim().optional(),
  sourceQuery: z.string().trim().optional(),
  ownerUserId: z.string().trim().uuid().optional(),
});

// GET /api/strategic/kpis
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const ownerUserId = searchParams.get('ownerUserId') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    // Construir chave de cache incluindo filtros
    const filters = JSON.stringify({ goalId, status, ownerUserId, page, pageSize });
    const filtersHash = Buffer.from(filters).toString('base64').slice(0, 16);
    const cacheKey = `org:${context.organizationId}:branch:${context.branchId}:filters:${filtersHash}`;
    
    // Tentar buscar do cache
    const cached = await CacheService.get<{
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
    }>(cacheKey, 'kpis:');
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Key': `kpis:${cacheKey}`,
        },
      });
    }

    // Cache MISS - buscar do banco
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

    const response = {
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
    };

    // Cachear resultado
    await CacheService.set(cacheKey, response, CacheTTL.SHORT, 'kpis:');

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'X-Cache-TTL': String(CacheTTL.SHORT),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/kpis error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/kpis
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

    // Invalidar cache de KPIs após criação
    await CacheService.invalidatePattern('*', 'kpis:');

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/kpis error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
