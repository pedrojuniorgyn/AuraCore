/**
 * API: User Roles
 *
 * GET /api/strategic/users/[id]/roles - Get user roles
 * POST /api/strategic/users/[id]/roles - Assign role to user
 *
 * @module app/api/strategic/users/[id]/roles
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Role } from '@/lib/permissions/permission-types';
import { SYSTEM_ROLES } from '@/lib/permissions/permission-types';

export const dynamic = 'force-dynamic';

// Mock user roles store
const userRolesStore = new Map<string, string[]>();

// Initialize with some mock data
if (userRolesStore.size === 0) {
  userRolesStore.set('user-1', ['role-1', 'role-2']); // Admin + Gestor KPIs
  userRolesStore.set('user-2', ['role-2']); // Gestor KPIs
  userRolesStore.set('user-3', ['role-3']); // Executor
  userRolesStore.set('user-4', ['role-4']); // Visualizador
}

// Mock roles store
const rolesStore = new Map<string, Role>();

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const roleIds = userRolesStore.get(id) || [];
    const roles = roleIds
      .map((roleId) => rolesStore.get(roleId))
      .filter((role): role is Role => role !== undefined);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('GET /api/strategic/users/[id]/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json({ error: 'roleId is required' }, { status: 400 });
    }

    const role = rolesStore.get(roleId);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const currentRoles = userRolesStore.get(id) || [];
    if (!currentRoles.includes(roleId)) {
      userRolesStore.set(id, [...currentRoles, roleId]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/strategic/users/[id]/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
