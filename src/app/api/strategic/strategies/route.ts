/**
 * API Routes: /api/strategic/strategies
 * CRUD de estratégias
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CreateStrategyUseCase } from '@/modules/strategic/application/commands/CreateStrategyUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';

// Schema de validação
const createStrategySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(200),
  vision: z.string().trim().optional(),
  mission: z.string().trim().optional(),
  values: z.array(z.string().trim()).optional(),
  startDate: z.string().trim().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Data inicial inválida' })
    .transform((s) => new Date(s)),
  endDate: z.string().trim().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Data final inválida' })
    .transform((s) => new Date(s)),
});

// ✅ S1.1 Batch 3: Schema de query
const queryStrategiesSchema = z.object({
  status: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/strategic/strategies
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // ✅ S1.1 Batch 3: Validar query params
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = queryStrategiesSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { status, page, pageSize } = validation.data;

    const repository = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      status,
      page,
      pageSize,
    });

    return NextResponse.json({
      items: result.items.map((s) => ({
        id: s.id,
        name: s.name,
        vision: s.vision,
        mission: s.mission,
        values: s.values,
        status: s.status,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
      total: result.total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/strategies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/strategies
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
    const validation = createStrategySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(CreateStrategyUseCase);
    const result = await useCase.execute(validation.data, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/strategies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
