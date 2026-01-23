/**
 * API Routes: /api/strategic/strategies
 * CRUD de estratégias
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
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
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  vision: z.string().optional(),
  mission: z.string().optional(),
  values: z.array(z.string()).optional(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
});

// GET /api/strategic/strategies
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

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
export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const body = await request.json();
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
