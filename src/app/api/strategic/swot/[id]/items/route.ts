/**
 * API Route: /api/strategic/swot/[id]/items
 * GET - Busca itens SWOT por análise (quadrantes F/W/O/T)
 * 
 * @module app/api/strategic/swot
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { ISwotAnalysisRepository } from '@/modules/strategic/domain/ports/output/ISwotAnalysisRepository';

import { logger } from '@/shared/infrastructure/logging';
// GET /api/strategic/swot/[id]/items
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
    const itemId = params.id;

    const repository = container.resolve<ISwotAnalysisRepository>(
      STRATEGIC_TOKENS.SwotAnalysisRepository
    );

    // Buscar o item principal para pegar o strategyId
    const mainItem = await repository.findById(
      itemId,
      tenantContext.organizationId,
      tenantContext.branchId
    );

    if (!mainItem) {
      return NextResponse.json({ error: 'SWOT Analysis not found' }, { status: 404 });
    }

    // Buscar todos os itens da mesma estratégia
    let allItems;
    if (mainItem.strategyId) {
      allItems = await repository.findByStrategy(
        mainItem.strategyId,
        tenantContext.organizationId,
        tenantContext.branchId
      );
    } else {
      // Se não tem strategyId, retornar apenas o item principal em cada quadrante
      allItems = [mainItem];
    }

    // Agrupar por quadrante
    const items = {
      strengths: allItems
        .filter((item) => item.quadrant === 'STRENGTH')
        .map((item) => ({
          id: item.id,
          description: item.title,
          detail: item.description || '',
          impact: item.impactScore,
          probability: item.probabilityScore,
          priority: (item.impactScore * item.probabilityScore) / 2.5,
          category: item.category || 'N/A',
          status: item.status,
        })),
      weaknesses: allItems
        .filter((item) => item.quadrant === 'WEAKNESS')
        .map((item) => ({
          id: item.id,
          description: item.title,
          detail: item.description || '',
          impact: item.impactScore,
          probability: item.probabilityScore,
          priority: (item.impactScore * item.probabilityScore) / 2.5,
          category: item.category || 'N/A',
          status: item.status,
        })),
      opportunities: allItems
        .filter((item) => item.quadrant === 'OPPORTUNITY')
        .map((item) => ({
          id: item.id,
          description: item.title,
          detail: item.description || '',
          impact: item.impactScore,
          probability: item.probabilityScore,
          priority: (item.impactScore * item.probabilityScore) / 2.5,
          category: item.category || 'N/A',
          status: item.status,
        })),
      threats: allItems
        .filter((item) => item.quadrant === 'THREAT')
        .map((item) => ({
          id: item.id,
          description: item.title,
          detail: item.description || '',
          impact: item.impactScore,
          probability: item.probabilityScore,
          priority: (item.impactScore * item.probabilityScore) / 2.5,
          category: item.category || 'N/A',
          status: item.status,
        })),
    };

    return NextResponse.json({
      items,
      itemId: mainItem.id,
      strategyId: mainItem.strategyId,
      total: allItems.length,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('[SWOT Items] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
