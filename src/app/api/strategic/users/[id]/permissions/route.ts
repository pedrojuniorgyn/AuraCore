/**
 * API: User Effective Permissions
 *
 * GET /api/strategic/users/[id]/permissions - Get user permissions
 *
 * @module app/api/strategic/users/[id]/permissions
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Role, Permission } from '@/lib/permissions/permission-types';
import { SYSTEM_ROLES } from '@/lib/permissions/permission-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Mock stores
const userRolesStore = new Map<string, string[]>();
const rolesStore = new Map<string, Role>();

// Initialize
if (rolesStore.size === 0) {
  SYSTEM_ROLES.forEach((role, index) => {
    const id = `role-${index + 1}`;
    rolesStore.set(id, {
      id,
      ...role,
      userCount: Math.floor(Math.random() * 20) + 5,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
  });
}

if (userRolesStore.size === 0) {
  userRolesStore.set('user-1', ['role-1']);
}

export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const roleIds = userRolesStore.get(id) || [];

    // Collect all permissions from all roles
    const permissionsSet = new Map<string, Permission>();

    for (const roleId of roleIds) {
      const role = rolesStore.get(roleId);
      if (role) {
        for (const perm of role.permissions) {
          const key = `${perm.resource}:${perm.action}`;
          permissionsSet.set(key, perm);
        }
      }
    }

    const permissions = Array.from(permissionsSet.values());

    return NextResponse.json({ permissions });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/users/[id]/permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
