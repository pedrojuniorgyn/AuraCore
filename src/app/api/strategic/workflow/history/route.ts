/**
 * API Routes: /api/strategic/workflow/history
 * GET - List all approval history entries
 *
 * @module app/api/strategic/workflow
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IApprovalHistoryRepository } from '@/modules/strategic/domain/ports/output/IApprovalHistoryRepository';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import type { Strategy } from '@/modules/strategic/domain/entities/Strategy';
import '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * GET /api/strategic/workflow/history
 * Get all approval history with optional filters
 * 
 * Query params:
 * - action: Filter by action type (SUBMIT, APPROVE, REJECT, REQUEST_CHANGES)
 * - limit: Maximum number of entries (default: 100)
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const actionFilter = searchParams.get('action');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 100;

    // Buscar todas as estratégias para obter IDs
    const strategyRepo = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );
    
    const historyRepo = container.resolve<IApprovalHistoryRepository>(
      STRATEGIC_TOKENS.ApprovalHistoryRepository
    );

    // Buscar estratégias (para obter nomes) usando findMany
    const { items: strategies } = await strategyRepo.findMany({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      pageSize: 500, // Limitar para performance
    });

    // Criar mapa de estratégias
    const strategyMap = new Map<string, Strategy>(strategies.map((s: Strategy) => [s.id, s]));

    // Buscar histórico de cada estratégia
    const allHistory: Array<{
      id: string;
      strategyId: string;
      strategyName: string;
      strategyCode: string;
      action: string;
      actorUserId: number;
      actorName?: string;
      comments?: string;
      reason?: string;
      fromStatus: string;
      toStatus: string;
      createdAt: Date;
    }> = [];

    for (const strategy of strategies) {
      const historyEntries = await historyRepo.findByStrategyId(
        strategy.id,
        tenantContext.organizationId,
        tenantContext.branchId
      );

      for (const entry of historyEntries) {
        // Aplicar filtro de ação se especificado
        if (actionFilter && entry.action !== actionFilter) {
          continue;
        }

        allHistory.push({
          id: entry.id,
          strategyId: entry.strategyId,
          strategyName: strategy.name,
          strategyCode: strategy.id.substring(0, 8).toUpperCase(),
          action: entry.action,
          actorUserId: entry.actorUserId,
          comments: entry.comments || undefined,
          reason: entry.comments || undefined, // Use comments as reason (same field)
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          createdAt: entry.createdAt,
        });
      }
    }

    // Ordenar por data (mais recente primeiro) e limitar
    const sortedHistory = allHistory
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      total: sortedHistory.length,
      data: sortedHistory,
    });
  } catch (error) {
    logger.error('Error getting approval history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
