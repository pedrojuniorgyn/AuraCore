import { NextRequest, NextResponse } from 'next/server';
import type { KeyResult } from '@/lib/okrs/okr-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { id: okrId } = await context.params;

  // Get OKR and return its key results
  const response = await fetch(
    new URL(`/api/strategic/okrs/${okrId}`, request.url).toString()
  );
  
  if (!response.ok) {
    return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
  }

  const okr = await response.json();
  return NextResponse.json({ keyResults: okr.keyResults || [] });
});

export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { id: okrId } = await context.params;

  try {
    const body = await request.json();

    const newKeyResult: KeyResult = {
      id: `kr-${Date.now()}`,
      okrId,
      title: body.title,
      description: body.description,
      metricType: body.metricType || 'number',
      startValue: body.startValue ?? 0,
      targetValue: body.targetValue ?? 100,
      currentValue: body.currentValue ?? body.startValue ?? 0,
      unit: body.unit,
      progress: body.progress ?? 0,
      status: body.status || 'not_started',
      linkedKpiId: body.linkedKpiId,
      linkedKpiName: body.linkedKpiName,
      linkedActionPlanId: body.linkedActionPlanId,
      linkedActionPlanName: body.linkedActionPlanName,
      weight: body.weight ?? 100,
      valueHistory: [
        {
          value: body.currentValue ?? body.startValue ?? 0,
          progress: body.progress ?? 0,
          timestamp: new Date(),
          updatedBy: body.updatedBy || 'Sistema',
        },
      ],
      order: body.order ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In real implementation, add to OKR in database
    return NextResponse.json(newKeyResult, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error creating Key Result:', error);
    return NextResponse.json({ error: 'Failed to create Key Result' }, { status: 500 });
  }
});
