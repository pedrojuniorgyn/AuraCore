/**
 * API Route: /api/strategic/pdca/[id]/phase-history
 * GET - Busca histórico de fases de um Action Plan (ciclo PDCA)
 * 
 * @module app/api/strategic/pdca
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/strategic/pdca/[id]/phase-history
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const actionPlanId = params.id;

    // Buscar histórico de transições PDCA
    // Nota: Como não existe tabela específica de histórico de fases,
    // vou buscar as transições da API mock /api/strategic/pdca
    // Em produção, deveria existir uma tabela strategic_pdca_transition
    
    // Por enquanto, vou retornar um histórico mock baseado no Action Plan atual
    const planResult = await db.execute(sql`
      SELECT 
        ap.id,
        ap.code,
        ap.what as title,
        ap.pdca_cycle as currentPhase,
        ap.when_start as startDate,
        ap.when_end as endDate,
        ap.completion_percent as progress,
        ap.who as responsible,
        ap.created_at as createdAt
      FROM strategic_action_plan ap
      WHERE 
        ap.id = ${actionPlanId}
        AND ap.organization_id = ${tenantContext.organizationId}
        AND ap.branch_id = ${tenantContext.branchId}
        AND ap.deleted_at IS NULL
    `);

    type PlanRow = {
      id: string;
      code: string;
      title: string;
      currentPhase: string;
      startDate: Date;
      endDate: Date;
      progress: number;
      responsible: string;
      createdAt: Date;
    };

    const planData = (planResult.recordset || planResult) as PlanRow[];
    const plan = planData[0];

    if (!plan) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 });
    }

    // Gerar histórico mock baseado na fase atual
    // TODO: Quando implementar tabela de transições, buscar dados reais
    const phaseHistory = generateMockPhaseHistory(plan);

    return NextResponse.json({
      phaseHistory,
      actionPlanId: plan.id,
      currentPhase: plan.currentPhase,
      total: phaseHistory.length,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[PDCA Phase History] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// Gera histórico mock de fases baseado na fase atual
function generateMockPhaseHistory(plan: {
  currentPhase: string;
  startDate: Date;
  endDate: Date;
  responsible: string;
  progress: number;
}) {
  const phases = ['PLAN', 'DO', 'CHECK', 'ACT'];
  const currentIndex = phases.indexOf(plan.currentPhase);
  
  if (currentIndex === -1) {
    return [];
  }

  const history = [];
  const totalDuration = plan.endDate.getTime() - plan.startDate.getTime();
  const phaseDuration = totalDuration / 4; // Dividir em 4 fases

  for (let i = 0; i <= currentIndex; i++) {
    const phaseStartDate = new Date(plan.startDate.getTime() + i * phaseDuration);
    const phaseEndDate = i === currentIndex 
      ? new Date() // Fase atual ainda em andamento
      : new Date(plan.startDate.getTime() + (i + 1) * phaseDuration);
    
    const durationDays = Math.ceil(
      (phaseEndDate.getTime() - phaseStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const phaseProgress = i === currentIndex ? plan.progress : 100;

    history.push({
      phase: phases[i],
      phaseLabel: getPhaseLabel(phases[i]),
      startDate: phaseStartDate.toISOString(),
      endDate: i === currentIndex ? null : phaseEndDate.toISOString(),
      durationDays,
      responsible: plan.responsible,
      progress: phaseProgress,
      actions: getMockActions(phases[i]),
      isCurrentPhase: i === currentIndex,
    });
  }

  return history;
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    PLAN: 'Planejar',
    DO: 'Executar',
    CHECK: 'Verificar',
    ACT: 'Agir',
  };
  return labels[phase] || phase;
}

function getMockActions(phase: string): string[] {
  const actions: Record<string, string[]> = {
    PLAN: [
      'Definição de objetivos e metas',
      'Identificação de causas raiz',
      'Elaboração do plano de ação',
      'Definição de indicadores',
    ],
    DO: [
      'Implementação do plano de ação',
      'Treinamento da equipe',
      'Execução das atividades planejadas',
      'Registro de evidências',
    ],
    CHECK: [
      'Análise dos resultados obtidos',
      'Comparação com metas estabelecidas',
      'Identificação de desvios',
      'Validação de evidências',
    ],
    ACT: [
      'Padronização de melhorias',
      'Correção de desvios',
      'Planejamento de novas melhorias',
      'Documentação de lições aprendidas',
    ],
  };
  return actions[phase] || [];
}
