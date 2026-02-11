/**
 * API: Strategic Role by ID
 *
 * GET /api/strategic/roles/[id] - Get role
 * PATCH /api/strategic/roles/[id] - Update role
 * DELETE /api/strategic/roles/[id] - Delete role
 *
 * @module app/api/strategic/roles/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Role } from '@/lib/permissions/permission-types';
import { SYSTEM_ROLES } from '@/lib/permissions/permission-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Reference the same store (in production, use database)
const rolesStore = new Map<string, Role>();

// Initialize with system roles if empty
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
    const role = rolesStore.get(id);

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PATCH = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const role = rolesStore.get(id);

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot modify system roles' }, { status: 403 });
    }

    const body = await request.json();

    const updated: Role = {
      ...role,
      ...body,
      id: role.id,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: new Date(),
    };

    rolesStore.set(id, updated);

    return NextResponse.json(updated);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('PATCH /api/strategic/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const role = rolesStore.get(id);

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 403 });
    }

    rolesStore.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('DELETE /api/strategic/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
