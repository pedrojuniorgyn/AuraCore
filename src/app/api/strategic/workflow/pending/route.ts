/**
 * API Routes: /api/strategic/workflow/pending
 * GET - List strategies pending approval
 *
 * @module app/api/strategic/workflow
 */
import 'reflect-metadata';
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import '@/modules/strategic/infrastructure/di/StrategicModule';

/**
 * GET /api/strategic/workflow/pending
 * Get all strategies pending approval
 */
export async function GET() {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const strategyRepo = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    const strategies = await strategyRepo.findByWorkflowStatus(
      'PENDING_APPROVAL',
      tenantContext.organizationId,
      tenantContext.branchId
    );

    const data = strategies.map((s) => ({
      id: s.id,
      name: s.name,
      versionType: s.versionType,
      versionName: s.versionName,
      workflowStatus: s.workflowStatus.value,
      submittedAt: s.submittedAt,
      submittedByUserId: s.submittedByUserId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('Error getting pending strategies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
