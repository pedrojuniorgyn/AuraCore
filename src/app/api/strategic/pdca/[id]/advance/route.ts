/**
 * API: Advance PDCA Phase
 * Avança o Action Plan para a próxima fase do ciclo PDCA
 * @module api/strategic/pdca/[id]/advance
 */
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
const PHASE_ORDER = ['PLAN', 'DO', 'CHECK', 'ACT'] as const;
type Phase = (typeof PHASE_ORDER)[number];

interface ActionPlanState {
  id: string;
  code: string;
  title: string;
  currentPhase: Phase;
}

// Mock action plans state
const actionPlansState = new Map<string, ActionPlanState>();

function initializeMockData() {
  if (actionPlansState.size > 0) return;

  actionPlansState.set('ap-001', {
    id: 'ap-001',
    code: 'AP-2026-001',
    title: 'Melhoria OTD Região Sul',
    currentPhase: 'CHECK',
  });

  actionPlansState.set('ap-002', {
    id: 'ap-002',
    code: 'AP-2026-002',
    title: 'Redução de Devoluções',
    currentPhase: 'DO',
  });

  actionPlansState.set('ap-003', {
    id: 'ap-003',
    code: 'AP-2026-003',
    title: 'Otimização de Rotas',
    currentPhase: 'PLAN',
  });
}

// POST - Avançar para próxima fase
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  initializeMockData();
  const { id: actionPlanId } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const { transitionReason, evidences, completionPercent } = body;

    // Buscar action plan
    let actionPlan = actionPlansState.get(actionPlanId);

    // Se não existe, criar com fase inicial
    if (!actionPlan) {
      actionPlan = {
        id: actionPlanId,
        code: `AP-${actionPlanId.slice(0, 8).toUpperCase()}`,
        title: 'Action Plan',
        currentPhase: 'PLAN',
      };
      actionPlansState.set(actionPlanId, actionPlan);
    }

    const currentPhase = actionPlan.currentPhase;
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);

    // Verificar se já está na última fase
    if (currentIndex === PHASE_ORDER.length - 1) {
      return NextResponse.json(
        {
          error: 'Ciclo PDCA já está na fase ACT (última fase)',
          suggestion: 'Para reiniciar o ciclo, use a fase PLAN novamente',
          currentPhase,
        },
        { status: 400 }
      );
    }

    const nextPhase = PHASE_ORDER[currentIndex + 1];

    // Atualizar estado
    actionPlan.currentPhase = nextPhase;
    actionPlansState.set(actionPlanId, actionPlan);

    // Criar registro de transição
    const transition = {
      id: `pdca-${Date.now()}`,
      actionPlanId,
      actionPlanCode: actionPlan.code,
      actionPlanTitle: actionPlan.title,
      fromPhase: currentPhase,
      toPhase: nextPhase,
      transitionReason: transitionReason || `Avançado de ${currentPhase} para ${nextPhase}`,
      evidences: evidences || [],
      completionPercent: completionPercent || Math.round((currentIndex + 2) * 25),
      transitionedBy: 'Usuário Atual',
      transitionedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      transition,
      message: `Avançado de ${currentPhase} para ${nextPhase}`,
      previousPhase: currentPhase,
      currentPhase: nextPhase,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error advancing PDCA phase:', error);
    return NextResponse.json({ error: 'Failed to advance PDCA phase' }, { status: 500 });
  }
});
