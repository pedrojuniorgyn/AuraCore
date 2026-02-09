/**
 * API Route: /api/strategic/swot/grid
 * GET - Lista SWOT Analyses para Grid com contagem de itens por quadrante
 * 
 * @module app/api/strategic/swot
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { ISwotAnalysisRepository } from '@/modules/strategic/domain/ports/output/ISwotAnalysisRepository';

// Cálculo de prioridade estratégica (1-10)
function calculateStrategicPriority(impact: number, probability: number): number {
  // Fórmula: (impacto * probabilidade) / 2.5
  // Escalona valores de 1-5 para 1-10
  const priority = (impact * probability) / 2.5;
  return Math.min(10, Math.max(1, Math.round(priority * 10) / 10));
}

// Mapear impact/probability score (1-5) para labels
function scoreToLabel(score: number, type: 'impact' | 'probability'): string {
  if (score >= 4) return type === 'impact' ? 'Alto' : 'Alta';
  if (score >= 2.5) return type === 'impact' ? 'Médio' : 'Média';
  return type === 'impact' ? 'Baixo' : 'Baixa';
}

// GET /api/strategic/swot/grid
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const quadrant = searchParams.get('quadrant') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const repository = container.resolve<ISwotAnalysisRepository>(
      STRATEGIC_TOKENS.SwotAnalysisRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page,
      pageSize,
      quadrant: quadrant as 'STRENGTH' | 'WEAKNESS' | 'OPPORTUNITY' | 'THREAT' | undefined,
      status: status as 'IDENTIFIED' | 'ANALYZING' | 'ACTION_DEFINED' | 'MONITORING' | 'RESOLVED' | undefined,
    });

    // Filtrar por search (título, descrição)
    let filteredItems = result.items;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = result.items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    // Agrupar itens por strategyId para contar por quadrante
    const strategiesMap = new Map<string, {
      id: string;
      title: string;
      description: string | undefined;
      status: string;
      itemsCount: {
        strengths: number;
        weaknesses: number;
        opportunities: number;
        threats: number;
      };
      impact: string;
      probability: string;
      strategicPriority: number;
      createdAt: Date;
    }>();

    // Processar itens e agrupar por strategyId
    for (const item of filteredItems) {
      const strategyId = item.strategyId || 'unassigned';
      
      if (!strategiesMap.has(strategyId)) {
        strategiesMap.set(strategyId, {
          id: item.id, // Usar id do primeiro item como proxy
          title: item.title,
          description: item.description ?? undefined,
          status: item.status,
          itemsCount: {
            strengths: 0,
            weaknesses: 0,
            opportunities: 0,
            threats: 0,
          },
          impact: scoreToLabel(item.impactScore, 'impact'),
          probability: scoreToLabel(item.probabilityScore, 'probability'),
          strategicPriority: calculateStrategicPriority(item.impactScore, item.probabilityScore),
          createdAt: item.createdAt,
        });
      }

      const strategy = strategiesMap.get(strategyId)!;
      
      // Incrementar contadores por quadrante
      switch (item.quadrant) {
        case 'STRENGTH':
          strategy.itemsCount.strengths++;
          break;
        case 'WEAKNESS':
          strategy.itemsCount.weaknesses++;
          break;
        case 'OPPORTUNITY':
          strategy.itemsCount.opportunities++;
          break;
        case 'THREAT':
          strategy.itemsCount.threats++;
          break;
      }

      // Atualizar prioridade para a mais alta do grupo
      const itemPriority = calculateStrategicPriority(item.impactScore, item.probabilityScore);
      if (itemPriority > strategy.strategicPriority) {
        strategy.strategicPriority = itemPriority;
        strategy.impact = scoreToLabel(item.impactScore, 'impact');
        strategy.probability = scoreToLabel(item.probabilityScore, 'probability');
      }
    }

    const strategies = Array.from(strategiesMap.values());

    return NextResponse.json({
      data: strategies.map((strategy) => ({
        id: strategy.id,
        code: `SWOT-${strategy.id.substring(0, 8).toUpperCase()}`,
        title: strategy.title,
        description: strategy.description || '',
        itemsCount: strategy.itemsCount,
        status: strategy.status,
        responsible: 'N/A', // TODO: Adicionar responsável ao schema
        impact: strategy.impact,
        probability: strategy.probability,
        strategicPriority: strategy.strategicPriority,
        createdAt: strategy.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total: strategies.length,
        totalPages: Math.ceil(strategies.length / pageSize),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[SWOT Grid] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
