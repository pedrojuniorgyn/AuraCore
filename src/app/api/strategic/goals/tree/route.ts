/**
 * API: GET /api/strategic/goals/tree
 * Retorna árvore de cascateamento para Treemap
 * 
 * ✅ BUG-003 FIX: Implementa PAGE PLANNING para evitar truncamento silencioso
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import { GoalCascadeService, type CascadeTreeNode } from '@/modules/strategic/domain/services/GoalCascadeService';

// ✅ BUG-003 FIX: Constantes para PAGE PLANNING
const PAGE_SIZE = 100;
const MAX_PAGES = 100; // Limite de segurança (10.000 goals máximo)

function formatForTreemap(node: CascadeTreeNode): {
  name: string;
  value: number;
  progress: number;
  status: string;
  children?: ReturnType<typeof formatForTreemap>[];
} {
  return {
    name: node.goal.code,
    value: node.goal.weight,
    progress: node.goal.progress,
    status: node.goal.status.value,
    ...(node.children.length > 0 && {
      children: node.children.map(formatForTreemap),
    }),
  };
}

export async function GET(request: Request) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rootGoalId = searchParams.get('rootGoalId') ?? undefined;
    const format = searchParams.get('format') ?? 'tree'; // 'tree' ou 'treemap'

    const repository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    // =========================================================================
    // ✅ BUG-003 FIX: PAGE PLANNING - Paginação determinística sem truncamento silencioso
    // =========================================================================
    type GoalItem = Awaited<ReturnType<typeof repository.findMany>>['items'][number];
    const allGoals: GoalItem[] = [];
    const warnings: string[] = [];
    let truncated = false;

    // 1. Fetch página 1 para obter total
    const firstPage = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: PAGE_SIZE,
    });

    const total = firstPage.total;
    allGoals.push(...firstPage.items);

    // 2. Calcular páginas necessárias
    const requiredPages = Math.ceil(total / PAGE_SIZE);
    const pagesToFetch = Math.min(requiredPages, MAX_PAGES);

    // 3. Se requiredPages > MAX_PAGES: disclosure obrigatório
    if (requiredPages > MAX_PAGES) {
      truncated = true;
      const warnMsg =
        `Truncamento: tenant ${context.organizationId}/${context.branchId} tem ${total} goals (${requiredPages} páginas), ` +
        `mas apenas ${MAX_PAGES} páginas serão buscadas (${MAX_PAGES * PAGE_SIZE} goals máximo).`;
      console.warn(`[GET /api/strategic/goals/tree] ${warnMsg}`);
      warnings.push(warnMsg);
    }

    // 4. Iterar páginas restantes (2 até pagesToFetch)
    for (let page = 2; page <= pagesToFetch; page++) {
      const { items } = await repository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        page,
        pageSize: PAGE_SIZE,
      });
      allGoals.push(...items);
    }

    // =========================================================================
    // Construir árvore com todos os goals
    // =========================================================================
    
    if (allGoals.length === 0) {
      return NextResponse.json({
        name: 'Estratégia',
        children: [],
        message: 'Nenhuma meta encontrada',
        _meta: {
          total: 0,
          fetched: 0,
          truncated: false,
          warnings: [],
        },
      });
    }

    // Construir árvore
    const treeResult = GoalCascadeService.buildCascadeTree(allGoals, rootGoalId);

    if (Result.isFail(treeResult)) {
      return NextResponse.json({ error: treeResult.error }, { status: 400 });
    }

    // Estatísticas
    const stats = GoalCascadeService.calculateCascadeStats(allGoals);

    // Metadata para transparência
    const meta = {
      total,
      fetched: allGoals.length,
      truncated,
      warnings,
    };

    if (format === 'treemap') {
      // Formato para @nivo/treemap
      const treemapData = {
        name: 'Estratégia',
        children: treeResult.value.map(formatForTreemap),
      };

      return NextResponse.json({
        data: treemapData,
        stats,
        _meta: meta,
      });
    }

    // Formato padrão (árvore)
    return NextResponse.json({
      tree: treeResult.value,
      stats,
      _meta: meta,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/goals/tree error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
