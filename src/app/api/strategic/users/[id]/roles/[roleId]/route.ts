/**
 * API: Remove Role from User
 *
 * DELETE /api/strategic/users/[id]/roles/[roleId] - Remove role
 *
 * @module app/api/strategic/users/[id]/roles/[roleId]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Reference the same store
const userRolesStore = new Map<string, string[]>();

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, roleId } = await context.params;
    const currentRoles = userRolesStore.get(id) || [];
    userRolesStore.set(id, currentRoles.filter((r) => r !== roleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('DELETE /api/strategic/users/[id]/roles/[roleId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
