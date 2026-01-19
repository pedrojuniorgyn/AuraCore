/**
 * API: GET /api/strategic/action-plans/kanban
 * Retorna planos agrupados por ciclo PDCA para Kanban
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';

interface KanbanCard {
  id: string;
  code: string;
  what: string;
  who: string;
  whenEnd: string;
  completionPercent: number;
  priority: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();
    const { searchParams } = new URL(request.url);

    const goalId = searchParams.get('goalId') ?? undefined;
    const whoUserId = searchParams.get('whoUserId') ?? undefined;

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    // Buscar todos os planos ativos (não completados/cancelados)
    const { items: allPlans } = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      goalId,
      whoUserId,
      page: 1,
      pageSize: 500,
    });

    // Filtrar apenas planos ativos (não COMPLETED, CANCELLED)
    const activePlans = allPlans.filter(
      (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
    );

    // Agrupar por PDCA
    const kanban: Record<string, KanbanCard[]> = {
      PLAN: [],
      DO: [],
      CHECK: [],
      ACT: [],
    };

    for (const plan of activePlans) {
      const card: KanbanCard = {
        id: plan.id,
        code: plan.code,
        what: plan.what,
        who: plan.who,
        whenEnd: plan.whenEnd.toISOString(),
        completionPercent: plan.completionPercent,
        priority: plan.priority,
        isOverdue: plan.isOverdue,
        daysUntilDue: Math.ceil(
          (plan.whenEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      };

      const cycle = plan.pdcaCycle.value;
      if (kanban[cycle]) {
        kanban[cycle].push(card);
      }
    }

    // Ordenar cada coluna por data de vencimento
    for (const cycle of Object.keys(kanban)) {
      kanban[cycle].sort((a, b) => 
        new Date(a.whenEnd).getTime() - new Date(b.whenEnd).getTime()
      );
    }

    return NextResponse.json({
      columns: [
        { id: 'PLAN', title: '📋 PLAN', color: '#3b82f6', items: kanban.PLAN },
        { id: 'DO', title: '⚡ DO', color: '#f59e0b', items: kanban.DO },
        { id: 'CHECK', title: '🔍 CHECK', color: '#8b5cf6', items: kanban.CHECK },
        { id: 'ACT', title: '✅ ACT', color: '#22c55e', items: kanban.ACT },
      ],
      stats: {
        total: activePlans.length,
        overdue: activePlans.filter(p => p.isOverdue).length,
        completedThisMonth: allPlans.filter(
          p => p.status === 'COMPLETED' && p.completionPercent >= 100
        ).length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/action-plans/kanban error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
