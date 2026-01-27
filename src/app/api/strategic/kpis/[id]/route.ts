/**
 * API Routes: /api/strategic/kpis/[id]
 * GET - Busca KPI por ID
 * DELETE - Remove KPI (soft delete)
 * 
 * @module app/api/strategic
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';

const idSchema = z.string().trim().uuid('Invalid kpi id');

// GET /api/strategic/kpis/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid kpi id' }, { status: 400 });
    }

    const repository = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );

    const kpi = await repository.findById(
      idResult.data,
      context.organizationId,
      context.branchId
    );

    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid kpi id' }, { status: 400 });
    }

    const repository = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );

    // Verificar se existe
    const kpi = await repository.findById(
      idResult.data,
      context.organizationId,
      context.branchId
    );

    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    }

    await repository.delete(idResult.data, context.organizationId, context.branchId);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/kpis/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
