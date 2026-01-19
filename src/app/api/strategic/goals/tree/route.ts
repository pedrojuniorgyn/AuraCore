/**
 * API: GET /api/strategic/goals/tree
 * Retorna árvore de cascateamento para Treemap
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import { GoalCascadeService, type CascadeTreeNode } from '@/modules/strategic/domain/services/GoalCascadeService';

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const rootGoalId = searchParams.get('rootGoalId') ?? undefined;
    const format = searchParams.get('format') ?? 'tree'; // 'tree' ou 'treemap'

    const repository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    // Buscar todas as metas
    const { items: goals } = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 1000,
    });

    if (goals.length === 0) {
      return NextResponse.json({
        name: 'Estratégia',
        children: [],
        message: 'Nenhuma meta encontrada',
      });
    }

    // Construir árvore
    const treeResult = GoalCascadeService.buildCascadeTree(goals, rootGoalId);

    if (Result.isFail(treeResult)) {
      return NextResponse.json({ error: treeResult.error }, { status: 400 });
    }

    // Estatísticas
    const stats = GoalCascadeService.calculateCascadeStats(goals);

    if (format === 'treemap') {
      // Formato para @nivo/treemap
      const treemapData = {
        name: 'Estratégia',
        children: treeResult.value.map(formatForTreemap),
      };

      return NextResponse.json({
        data: treemapData,
        stats,
      });
    }

    // Formato padrão (árvore)
    return NextResponse.json({
      tree: treeResult.value,
      stats,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/goals/tree error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Formata nó para @nivo/treemap
 */
function formatForTreemap(node: CascadeTreeNode): {
  name: string;
  description: string;
  value: number;
  progress: number;
  status: string;
  statusColor: string;
  level: string;
  children?: ReturnType<typeof formatForTreemap>[];
} {
  return {
    name: node.code,
    description: node.description,
    value: node.weight || 1, // Treemap precisa de value > 0
    progress: node.progress,
    status: node.status,
    statusColor: node.statusColor,
    level: node.cascadeLevel,
    children: node.children?.length > 0
      ? node.children.map(formatForTreemap)
      : undefined,
  };
}
