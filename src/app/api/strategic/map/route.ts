/**
 * API Route: /api/strategic/map
 * Retorna dados formatados para o Mapa Estratégico (ReactFlow)
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';

// Cores por perspectiva BSC
const PERSPECTIVE_COLORS: Record<string, string> = {
  FIN: '#fbbf24', // yellow-400
  CLI: '#3b82f6', // blue-500
  INT: '#22c55e', // green-500
  LRN: '#a855f7', // purple-500
};

// Y positions por perspectiva (de cima para baixo)
const PERSPECTIVE_Y: Record<string, number> = {
  FIN: 0,
  CLI: 200,
  INT: 400,
  LRN: 600,
};

// GET /api/strategic/map
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const strategyRepository = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );
    const goalRepository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    // Buscar estratégia ativa
    const strategy = await strategyRepository.findActive(
      context.organizationId,
      context.branchId
    );

    if (!strategy) {
      return NextResponse.json({ 
        nodes: [], 
        edges: [],
        perspectives: [],
        message: 'Nenhuma estratégia ativa encontrada' 
      });
    }

    // Buscar todas as metas
    const { items: goals } = await goalRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500, // Limite razoável para mapa
    });

    // Agrupar metas por perspectiva para calcular posição X
    const goalsByPerspective: Record<string, typeof goals> = {};
    for (const goal of goals) {
      const perspCode = extractPerspectiveCode(goal.perspectiveId);
      if (!goalsByPerspective[perspCode]) {
        goalsByPerspective[perspCode] = [];
      }
      goalsByPerspective[perspCode].push(goal);
    }

    // Construir nodes para ReactFlow
    const nodes = goals.map((goal) => {
      const perspCode = extractPerspectiveCode(goal.perspectiveId);
      const goalsInPerspective = goalsByPerspective[perspCode] || [];
      const indexInPerspective = goalsInPerspective.findIndex(g => g.id === goal.id);
      
      // Usar posição salva ou calcular
      const x = goal.mapPositionX ?? (indexInPerspective * 280 + 100);
      const y = goal.mapPositionY ?? (PERSPECTIVE_Y[perspCode] ?? 800);

      return {
        id: goal.id,
        type: 'bscObjective',
        position: { x, y },
        data: {
          code: goal.code,
          description: goal.description,
          perspectiveCode: perspCode,
          cascadeLevel: goal.cascadeLevel.value,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          unit: goal.unit,
          status: goal.status.value,
          statusColor: goal.status.color,
          progress: Math.round(goal.progress),
          color: PERSPECTIVE_COLORS[perspCode] ?? '#6b7280',
          ownerUserId: goal.ownerUserId,
        },
      };
    });

    // Construir edges (relações causa-efeito entre metas)
    const edges = goals
      .filter((goal) => goal.parentGoalId)
      .map((goal) => ({
        id: `e-${goal.parentGoalId}-${goal.id}`,
        source: goal.parentGoalId!,
        target: goal.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: '#94a3b8',
        },
      }));

    // Perspectivas do BSC
    const perspectives = [
      { code: 'FIN', name: 'Financeira', color: PERSPECTIVE_COLORS.FIN, y: PERSPECTIVE_Y.FIN },
      { code: 'CLI', name: 'Clientes', color: PERSPECTIVE_COLORS.CLI, y: PERSPECTIVE_Y.CLI },
      { code: 'INT', name: 'Processos Internos', color: PERSPECTIVE_COLORS.INT, y: PERSPECTIVE_Y.INT },
      { code: 'LRN', name: 'Aprendizado e Crescimento', color: PERSPECTIVE_COLORS.LRN, y: PERSPECTIVE_Y.LRN },
    ];

    return NextResponse.json({
      strategyId: strategy.id,
      strategyName: strategy.name,
      strategyStatus: strategy.status,
      nodes,
      edges,
      perspectives,
      summary: {
        totalGoals: goals.length,
        byStatus: summarizeByStatus(goals),
        byCascadeLevel: summarizeByCascadeLevel(goals),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/map error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Extrai código da perspectiva do ID (primeiros 3 caracteres uppercase)
 */
function extractPerspectiveCode(perspectiveId: string): string {
  // Se o perspectiveId começa com FIN, CLI, INT, LRN
  const upper = perspectiveId.toUpperCase();
  for (const code of ['FIN', 'CLI', 'INT', 'LRN']) {
    if (upper.startsWith(code)) return code;
  }
  // Fallback: primeiros 3 caracteres
  return perspectiveId.substring(0, 3).toUpperCase();
}

/**
 * Agrupa contagem de metas por status
 */
function summarizeByStatus(goals: Array<{ status: { value: string } }>): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const goal of goals) {
    const status = goal.status.value;
    summary[status] = (summary[status] || 0) + 1;
  }
  return summary;
}

/**
 * Agrupa contagem de metas por nível de cascateamento
 */
function summarizeByCascadeLevel(goals: Array<{ cascadeLevel: { value: string } }>): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const goal of goals) {
    const level = goal.cascadeLevel.value;
    summary[level] = (summary[level] || 0) + 1;
  }
  return summary;
}
