/**
 * API Route: /api/strategic/map
 * Retorna dados formatados para o Mapa Estratégico (ReactFlow)
 *
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import { db } from '@/lib/db';
import { bscPerspectiveTable } from '@/modules/strategic/infrastructure/persistence/schemas/bsc-perspective.schema';
import { eq } from 'drizzle-orm';

import { logger } from '@/shared/infrastructure/logging';
// Cores por perspectiva BSC
const PERSPECTIVE_COLORS: Record<string, string> = {
  FIN: '#fbbf24',
  CLI: '#3b82f6',
  INT: '#22c55e',
  LRN: '#a855f7',
};

// Y positions por perspectiva (de cima para baixo)
const PERSPECTIVE_Y: Record<string, number> = {
  FIN: 0,
  CLI: 200,
  INT: 400,
  LRN: 600,
};

// GET /api/strategic/map
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        message: 'Nenhuma estratégia ativa encontrada',
      });
    }

    // ✅ CORREÇÃO BUG 2: Buscar perspectivas da estratégia e criar Map<perspectiveId, code>
    // Em vez de extrair código por substring do UUID (que era incorreto)
    const perspectiveRows = await db
      .select({ id: bscPerspectiveTable.id, code: bscPerspectiveTable.code })
      .from(bscPerspectiveTable)
      .where(eq(bscPerspectiveTable.strategyId, strategy.id));

    const perspectiveCodeById = new Map<string, string>();
    for (const row of perspectiveRows) {
      perspectiveCodeById.set(row.id, row.code);
    }

    // =========================================================================
    // PAGE PLANNING: Paginação determinística sem truncamento silencioso
    // =========================================================================
    const PAGE_SIZE = 100;
    const MAX_PAGES = 100; // Limite de segurança (10.000 goals máximo)
    type GoalItem = Awaited<ReturnType<typeof goalRepository.findMany>>['items'][number];
    const allGoals: GoalItem[] = [];
    const warnings: string[] = [];
    let truncated = false;

    // 1. Fetch página 1 para obter total
    const firstPage = await goalRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      strategyId: strategy.id,
      page: 1,
      pageSize: PAGE_SIZE,
    });

    const total = firstPage.total;
    allGoals.push(...firstPage.items);

    // 2. Calcular páginas necessárias
    const requiredPages = Math.ceil(total / PAGE_SIZE);
    const pagesToFetch = Math.min(requiredPages, MAX_PAGES);

    // 3. Se requiredPages > MAX_PAGES: disclosure obrigatório (Modo B - Partial with Disclosure)
    if (requiredPages > MAX_PAGES) {
      truncated = true;
      const warnMsg =
        `Truncamento: strategy ${strategy.id} tem ${total} goals (${requiredPages} páginas), ` +
        `mas apenas ${MAX_PAGES} páginas serão buscadas (${MAX_PAGES * PAGE_SIZE} goals máximo).`;
      logger.warn(`[GET /api/strategic/map] ${warnMsg}`);
      warnings.push(warnMsg);
    }

    // Warning se quantidade atípica (>1000 goals)
    if (total > 1000) {
      const warnMsg = `Strategy ${strategy.id} tem ${total} goals. Isso é atípico para BSC - considere verificar dados.`;
      logger.warn(`[GET /api/strategic/map] ${warnMsg}`);
      warnings.push(warnMsg);
    }

    // 4. Iterar páginas restantes (2 até pagesToFetch) - página 1 já foi buscada
    for (let page = 2; page <= pagesToFetch; page++) {
      const { items } = await goalRepository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        strategyId: strategy.id,
        page,
        pageSize: PAGE_SIZE,
      });

      // Proteção contra inconsistência: página vazia antes de completar
      if (items.length === 0) {
        const warnMsg =
          `Paginação inconsistente: página ${page}/${pagesToFetch} retornou 0 items, ` +
          `mas total=${total}. allGoals.length=${allGoals.length}.`;
        logger.warn(`[GET /api/strategic/map] ${warnMsg}`);
        warnings.push(warnMsg);
        break;
      }

      allGoals.push(...items);
    }

    // ✅ CORREÇÃO: Separar goals válidos de inválidos (sem fallback silencioso para 'INT')
    // Goals com perspectiveId não mapeado indicam violação de integridade (FK quebrada, perspective deletada, etc.)
    const validGoals: typeof allGoals = [];
    const invalidGoals: Array<{ id: string; perspectiveId: string; code: string }> = [];

    for (const goal of allGoals) {
      const perspCode = perspectiveCodeById.get(goal.perspectiveId);
      if (perspCode) {
        validGoals.push(goal);
      } else {
        // Registrar goal inválido para observabilidade
        invalidGoals.push({
          id: goal.id,
          perspectiveId: goal.perspectiveId,
          code: goal.code,
        });
      }
    }

    // Gerar warnings estruturados se houver goals com perspectiveId não mapeado
    if (invalidGoals.length > 0) {
      const warnMsg =
        `${invalidGoals.length} goal(s) com perspectiveId não mapeado para strategy ${strategy.id}. ` +
        `Possíveis causas: FK quebrada, perspective deletada, ou goal pertence a outra strategy. ` +
        `IDs afetados: ${invalidGoals.slice(0, 20).map((g) => g.id).join(', ')}` +
        (invalidGoals.length > 20 ? ` (e mais ${invalidGoals.length - 20})` : '');
      logger.warn(warnMsg, { orgId: context.organizationId, branchId: context.branchId, invalidCount: invalidGoals.length });
      warnings.push(warnMsg);
    }

    const goals = validGoals;

    // Agrupar metas por perspectiva para calcular posição X
    const goalsByPerspective: Record<string, typeof goals> = {};
    for (const goal of goals) {
      // perspCode é garantido não-undefined após filtro acima
      const perspCode = perspectiveCodeById.get(goal.perspectiveId)!;
      if (!goalsByPerspective[perspCode]) {
        goalsByPerspective[perspCode] = [];
      }
      goalsByPerspective[perspCode].push(goal);
    }

    // Construir nodes para ReactFlow (apenas goals válidos)
    const nodes = goals.map((goal) => {
      // perspCode é garantido não-undefined após filtro acima
      const perspCode = perspectiveCodeById.get(goal.perspectiveId)!;
      const goalsInPerspective = goalsByPerspective[perspCode] || [];
      const indexInPerspective = goalsInPerspective.findIndex((g) => g.id === goal.id);

      const x = goal.mapPositionX ?? (indexInPerspective * 280 + 100);
      // ✅ FIX 3: Restaurar fallback para Y position (default 800)
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
          // ✅ FIX 3: Restaurar fallback para color (default slate-500)
          color: PERSPECTIVE_COLORS[perspCode] ?? '#64748b',
          ownerUserId: goal.ownerUserId,
        },
      };
    });

    // ✅ FIX 4: Criar Set de IDs válidos para garantir integridade das edges
    const validGoalIds = new Set(goals.map((g) => g.id));
    const orphanEdges: Array<{ childId: string; parentId: string }> = [];

    // Construir edges (relações causa-efeito entre metas)
    const edges = goals
      .filter((goal) => {
        if (!goal.parentGoalId) return false;
        
        // Verificar se o pai existe no conjunto de goals válidos
        if (!validGoalIds.has(goal.parentGoalId)) {
          orphanEdges.push({ childId: goal.id, parentId: goal.parentGoalId });
          return false;
        }
        
        return true;
      })
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

    // Registrar warnings para edges órfãs
    if (orphanEdges.length > 0) {
      const warnMsg =
        `${orphanEdges.length} edge(s) órfã(s) ignorada(s) (pai não encontrado ou inválido). ` +
        `Amostra: ${orphanEdges
          .slice(0, 5)
          .map((e) => `${e.parentId}->${e.childId}`)
          .join(', ')}`;
      logger.warn(`[GET /api/strategic/map] ${warnMsg}`);
      warnings.push(warnMsg);
    }

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
      // ✅ PAGE PLANNING: Disclosure obrigatório se truncado (Modo B)
      ...(truncated
        ? {
            truncated: true,
            pagination: {
              // ✅ FIX 2: returnedCount reflete payload real (pós-filtro)
              returnedCount: goals.length,
              // ✅ FIX 2: invalidFilteredCount para observabilidade
              invalidFilteredCount: invalidGoals.length,
              total,
              pagesFetched: pagesToFetch,
              pageSize: PAGE_SIZE,
              maxPages: MAX_PAGES,
            },
          }
        : {}),
      // ✅ CORREÇÃO: Observabilidade para goals com perspectiveId inválido (backward-compatible)
      ...(invalidGoals.length > 0
        ? {
            invalidGoalsCount: invalidGoals.length,
            invalidGoalsSample: invalidGoals.slice(0, 20).map((g) => ({
              id: g.id,
              perspectiveId: g.perspectiveId,
              code: g.code,
            })),
          }
        : {}),
      // Warnings gerais (paginação, etc.)
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('GET /api/strategic/map error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

function summarizeByStatus(goals: Array<{ status: { value: string } }>): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const goal of goals) {
    const status = goal.status.value;
    summary[status] = (summary[status] || 0) + 1;
  }
  return summary;
}

function summarizeByCascadeLevel(goals: Array<{ cascadeLevel: { value: string } }>): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const goal of goals) {
    const level = goal.cascadeLevel.value;
    summary[level] = (summary[level] || 0) + 1;
  }
  return summary;
}