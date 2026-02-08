/**
 * API Routes: /api/strategic/kpis/[id]
 * GET - Busca KPI por ID
 * PUT - Atualiza KPI
 * DELETE - Remove KPI (soft delete)
 * 
 * @module app/api/strategic
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import { KPI, type KPIPolarity, type KPIFrequency } from '@/modules/strategic/domain/entities/KPI';
import { Result } from '@/shared/domain';

const idSchema = z.string().trim().uuid('Invalid kpi id');

const updateKPISchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  unit: z.string().trim().min(1).max(50).optional(),
  polarity: z.enum(['UP', 'DOWN']).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  targetValue: z.number().optional(),
});

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

// PUT /api/strategic/kpis/[id]
export async function PUT(
  request: NextRequest,
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

    const body = await request.json();
    const validation = updateKPISchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const repository = container.resolve<IKPIRepository>(
      STRATEGIC_TOKENS.KPIRepository
    );

    // Buscar KPI existente
    const existingKpi = await repository.findById(
      idResult.data,
      context.organizationId,
      context.branchId
    );

    if (!existingKpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    }

    const data = validation.data;

    // Reconstituir com dados mesclados (existente + atualizado)
    const updatedResult = KPI.reconstitute({
      id: existingKpi.id,
      organizationId: existingKpi.organizationId,
      branchId: existingKpi.branchId,
      goalId: existingKpi.goalId,
      code: data.code ?? existingKpi.code,
      name: data.name ?? existingKpi.name,
      description: data.description !== undefined ? data.description : existingKpi.description,
      unit: data.unit ?? existingKpi.unit,
      polarity: (data.polarity as KPIPolarity) ?? existingKpi.polarity,
      frequency: (data.frequency as KPIFrequency) ?? existingKpi.frequency,
      targetValue: data.targetValue ?? existingKpi.targetValue,
      currentValue: existingKpi.currentValue,
      baselineValue: existingKpi.baselineValue,
      alertThreshold: existingKpi.alertThreshold,
      criticalThreshold: existingKpi.criticalThreshold,
      autoCalculate: existingKpi.autoCalculate,
      sourceModule: existingKpi.sourceModule,
      sourceQuery: existingKpi.sourceQuery,
      status: existingKpi.status,
      lastCalculatedAt: existingKpi.lastCalculatedAt,
      ownerUserId: existingKpi.ownerUserId,
      createdBy: existingKpi.createdBy,
      createdAt: existingKpi.createdAt,
      updatedAt: new Date(),
    });

    if (Result.isFail(updatedResult)) {
      return NextResponse.json(
        { error: 'Validation failed', details: updatedResult.error },
        { status: 400 }
      );
    }

    const updatedKpi = updatedResult.value;
    await repository.save(updatedKpi);

    return NextResponse.json({
      id: updatedKpi.id,
      goalId: updatedKpi.goalId,
      code: updatedKpi.code,
      name: updatedKpi.name,
      description: updatedKpi.description,
      unit: updatedKpi.unit,
      polarity: updatedKpi.polarity,
      frequency: updatedKpi.frequency,
      targetValue: updatedKpi.targetValue,
      currentValue: updatedKpi.currentValue,
      baselineValue: updatedKpi.baselineValue,
      alertThreshold: updatedKpi.alertThreshold,
      criticalThreshold: updatedKpi.criticalThreshold,
      status: updatedKpi.status,
      achievementPercent: updatedKpi.achievementPercent,
      deviationPercent: updatedKpi.deviationPercent,
      autoCalculate: updatedKpi.autoCalculate,
      sourceModule: updatedKpi.sourceModule,
      sourceQuery: updatedKpi.sourceQuery,
      lastCalculatedAt: updatedKpi.lastCalculatedAt,
      ownerUserId: updatedKpi.ownerUserId,
      createdBy: updatedKpi.createdBy,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PUT /api/strategic/kpis/[id] error:', error);
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
