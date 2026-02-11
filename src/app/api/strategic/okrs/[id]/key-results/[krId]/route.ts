import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { id: okrId, krId } = await context.params;

  // Get OKR and find specific key result
  const response = await fetch(
    new URL(`/api/strategic/okrs/${okrId}`, request.url).toString()
  );

  if (!response.ok) {
    return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
  }

  const okr = await response.json();
  const keyResult = okr.keyResults?.find(
    (kr: Record<string, unknown>) => kr.id === krId
  );

  if (!keyResult) {
    return NextResponse.json({ error: 'Key Result not found' }, { status: 404 });
  }

  return NextResponse.json(keyResult);
});

export const PATCH = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { id: okrId, krId } = await context.params;

  try {
    const body = await request.json();

    // Get existing OKR
    const response = await fetch(
      new URL(`/api/strategic/okrs/${okrId}`, request.url).toString()
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    const okr = await response.json();
    const krIndex = okr.keyResults?.findIndex(
      (kr: Record<string, unknown>) => kr.id === krId
    );

    if (krIndex === -1 || krIndex === undefined) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 });
    }

    // Update key result
    const updatedKR = {
      ...okr.keyResults[krIndex],
      ...body,
      updatedAt: new Date(),
    };

    // In real implementation, update in database
    return NextResponse.json(updatedKR);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error updating Key Result:', error);
    return NextResponse.json({ error: 'Failed to update Key Result' }, { status: 500 });
  }
});

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { krId } = await context.params;

  // In real implementation, delete from database
  logger.info('Deleting Key Result:', krId);

  return NextResponse.json({ success: true });
});
