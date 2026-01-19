/**
 * API Routes: /api/strategic/kpis/[id]
 * GET - Busca KPI por ID
 * DELETE - Remove KPI (soft delete)
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';

// GET /api/strategic/kpis/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const repository = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );

    const kpi = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!kpi) {
      return NextResponse.json({ error: 'KPI não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: kpi.id,
      goalId: kpi.goalId,
      code: kpi.code,
      name: kpi.name,
      description: kpi.description,
      unit: kpi.unit,
      polarity: kpi.polarity,
      frequency: kpi.frequency,
      targetValue: kpi.targetValue,
      currentValue: kpi.currentValue,
      baselineValue: kpi.baselineValue,
      alertThreshold: kpi.alertThreshold,
      criticalThreshold: kpi.criticalThreshold,
      status: kpi.status,
      achievementPercent: kpi.achievementPercent,
      deviationPercent: kpi.deviationPercent,
      autoCalculate: kpi.autoCalculate,
      sourceModule: kpi.sourceModule,
      sourceQuery: kpi.sourceQuery,
      lastCalculatedAt: kpi.lastCalculatedAt,
      ownerUserId: kpi.ownerUserId,
      createdBy: kpi.createdBy,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/kpis/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/strategic/kpis/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const repository = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );

    // Verificar se existe
    const kpi = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!kpi) {
      return NextResponse.json({ error: 'KPI não encontrado' }, { status: 404 });
    }

    await repository.delete(
      id,
      context.organizationId,
      context.branchId
    );

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/kpis/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
