/**
 * API Route: /api/strategic/pdca/grid
 * GET - Lista PDCA Cycles (Action Plans agrupados por fase) para Grid
 * 
 * @module app/api/strategic/pdca
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';

import { logger } from '@/shared/infrastructure/logging';
// GET /api/strategic/pdca/grid
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const currentPhase = searchParams.get('currentPhase') || undefined;
    const status = searchParams.get('status') || undefined;
    const whoUserId = searchParams.get('whoUserId') || undefined;
    const search = searchParams.get('search') || undefined;

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page,
      pageSize,
      pdcaCycle: currentPhase,
      status,
      whoUserId,
    });

    // Filtrar por search (código, título)
    let filteredItems = result.items;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = result.items.filter(
        (plan) =>
          plan.code.toLowerCase().includes(searchLower) ||
          plan.what.toLowerCase().includes(searchLower) ||
          (plan.why && plan.why.toLowerCase().includes(searchLower))
      );
    }

    return NextResponse.json({
      data: filteredItems.map((plan) => {
        // Calcular dias até prazo
        const daysUntilDue = Math.ceil(
          (plan.whenEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        // Verificar se está atrasado
        const isOverdue = daysUntilDue < 0 && plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED';

        // Efetividade (só calculado na fase Act)
        // Simplificação: efetividade = completionPercent na fase ACT
        const effectiveness = plan.pdcaCycle.value === 'ACT' ? plan.completionPercent : null;

        return {
          id: plan.id,
          code: plan.code,
          title: plan.what,
          description: plan.why || '',
          currentPhase: plan.pdcaCycle.value, // 'PLAN' | 'DO' | 'CHECK' | 'ACT'
          status: plan.status,
          responsible: plan.who,
          responsibleUserId: plan.whoUserId || null,
          startDate: plan.whenStart.toISOString(),
          endDate: plan.whenEnd.toISOString(),
          progress: plan.completionPercent || 0,
          effectiveness,
          isOverdue,
          daysUntilDue,
          createdAt: plan.createdAt.toISOString(),
          updatedAt: plan.updatedAt.toISOString(),
        };
      }),
      pagination: {
        page,
        pageSize,
        total: search ? filteredItems.length : result.total,
        totalPages: Math.ceil((search ? filteredItems.length : result.total) / pageSize),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('[PDCA Grid] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
