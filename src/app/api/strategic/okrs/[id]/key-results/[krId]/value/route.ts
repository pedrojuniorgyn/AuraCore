import { NextRequest, NextResponse } from 'next/server';
import type { KeyResult, KeyResultValueEntry } from '@/lib/okrs/okr-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { id: okrId, krId } = await context.params;

  try {
    const body = await request.json();
    const { value, comment } = body;

    // Get existing OKR
    const response = await fetch(
      new URL(`/api/strategic/okrs/${okrId}`, request.url).toString()
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    const okr = await response.json();
    const kr = okr.keyResults?.find(
      (k: Record<string, unknown>) => k.id === krId
    ) as KeyResult | undefined;

    if (!kr) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 });
    }

    // Calculate new progress
    const range = kr.targetValue - kr.startValue;
    const progress =
      range === 0
        ? value >= kr.targetValue
          ? 100
          : 0
        : Math.max(0, Math.min(100, Math.round(((value - kr.startValue) / range) * 100)));

    // Determine new status
    let status: KeyResult['status'] = 'not_started';
    if (progress >= 100) status = 'completed';
    else if (progress === 0) status = 'not_started';
    else if (progress >= 70) status = 'on_track';
    else if (progress >= 40) status = 'at_risk';
    else status = 'behind';

    // Create history entry
    const historyEntry: KeyResultValueEntry = {
      value,
      progress,
      timestamp: new Date(),
      updatedBy: 'Usuário',
      comment,
    };

    // Update key result
    const updatedKR: KeyResult = {
      ...kr,
      currentValue: value,
      progress,
      status,
      valueHistory: [...(kr.valueHistory || []), historyEntry],
      updatedAt: new Date(),
    };

    // In real implementation, update in database
    return NextResponse.json(updatedKR);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error updating Key Result value:', error);
    return NextResponse.json({ error: 'Failed to update value' }, { status: 500 });
  }
});
