/**
 * API Routes: /api/strategic/workflow/my-submissions
 * GET - List strategies submitted by the current user
 *
 * @module app/api/strategic/workflow
 */
import 'reflect-metadata';
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import type { Strategy } from '@/modules/strategic/domain/entities/Strategy';
import '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
interface SubmissionItem {
  id: string;
  strategyId: string;
  strategyTitle: string;
  strategyCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

/**
 * GET /api/strategic/workflow/my-submissions
 * Get all strategies submitted by the current user
 */
export const GET = withDI(async () => {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const strategyRepo = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    // Buscar todas as estratégias usando findMany
    const { items: strategies } = await strategyRepo.findMany({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      pageSize: 500, // Limitar para performance
    });

    // Filtrar apenas as que foram submetidas pelo usuário atual
    // userId no context é string, submittedByUserId é number
    const currentUserId = parseInt(tenantContext.userId, 10);
    const mySubmissions: SubmissionItem[] = strategies
      .filter((s: Strategy) => s.submittedByUserId === currentUserId)
      .map((s: Strategy): SubmissionItem => {
        // Determinar status simplificado
        let status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' = 'PENDING';
        const workflowStatus = s.workflowStatus.value;
        
        if (workflowStatus === 'APPROVED') {
          status = 'APPROVED';
        } else if (workflowStatus === 'REJECTED') {
          status = 'REJECTED';
        } else if (workflowStatus === 'CHANGES_REQUESTED') {
          status = 'CHANGES_REQUESTED';
        } else if (workflowStatus === 'PENDING_APPROVAL') {
          status = 'PENDING';
        }

        return {
          id: s.id,
          strategyId: s.id,
          strategyTitle: s.name,
          strategyCode: s.id.substring(0, 8).toUpperCase(),
          status,
          submittedAt: s.submittedAt?.toISOString() || s.createdAt.toISOString(),
          decidedAt: s.approvedAt?.toISOString() || s.rejectedAt?.toISOString(),
          decidedBy: s.approvedByUserId 
            ? `Usuário #${s.approvedByUserId}` 
            : s.rejectedByUserId 
              ? `Usuário #${s.rejectedByUserId}`
              : undefined,
        };
      })
      .sort((a: SubmissionItem, b: SubmissionItem) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

    return NextResponse.json({
      success: true,
      total: mySubmissions.length,
      data: mySubmissions,
    });
  } catch (error) {
    logger.error('Error getting my submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
