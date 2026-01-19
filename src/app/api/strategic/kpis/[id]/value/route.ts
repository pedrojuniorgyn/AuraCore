/**
 * API: PUT /api/strategic/kpis/[id]/value
 * Atualiza valor do KPI
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { UpdateKPIValueUseCase } from '@/modules/strategic/application/commands/UpdateKPIValueUseCase';

const updateValueSchema = z.object({
  value: z.number(),
  periodDate: z.string().transform((s) => new Date(s)).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const body = await request.json();
    const validation = updateValueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(UpdateKPIValueUseCase);
    const result = await useCase.execute(
      {
        kpiId: id,
        value: validation.data.value,
        periodDate: validation.data.periodDate,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PUT /api/strategic/kpis/[id]/value error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
