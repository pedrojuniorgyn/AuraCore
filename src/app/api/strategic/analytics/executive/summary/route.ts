/**
 * API: GET /api/strategic/analytics/executive/summary
 * Retorna dados consolidados para o Dashboard Executivo (C-level)
 * 
 * @module app/api/strategic/analytics/executive
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IGetExecutiveDashboardUseCase } from '@/modules/strategic/application/queries/GetExecutiveDashboardQuery';
import { Result } from '@/shared/domain';

export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    // Query params
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategyId') || undefined;
    const dateFrom = searchParams.get('dateFrom') 
      ? new Date(searchParams.get('dateFrom')!) 
      : undefined;
    const dateTo = searchParams.get('dateTo') 
      ? new Date(searchParams.get('dateTo')!) 
      : undefined;

    // Resolver use case do DI container
    const useCase = container.resolve<IGetExecutiveDashboardUseCase>(
      STRATEGIC_TOKENS.GetExecutiveDashboardUseCase
    );

    // Executar use case
    const result = await useCase.execute(
      { strategyId, dateFrom, dateTo },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/analytics/executive/summary error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// Enable dynamic rendering (disable static optimization)
export const dynamic = 'force-dynamic';
