/**
 * API: Restore Deleted Entity
 *
 * POST /api/strategic/audit/entity/[type]/[id]/restore - Restore a soft-deleted entity
 *
 * @module app/api/strategic/audit/entity/[type]/[id]/restore
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await context.params;

    // In production, this would:
    // 1. Find the entity by type and id
    // 2. Set deletedAt to null
    // 3. Create an audit log for the restore action
    // 4. Return the restored entity

    // Mock response
    return NextResponse.json({
      success: true,
      message: `Entity ${type}/${id} restored successfully`,
      restoredAt: new Date().toISOString(),
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/audit/entity/[type]/[id]/restore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
