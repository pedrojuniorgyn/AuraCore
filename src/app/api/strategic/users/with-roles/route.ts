/**
 * API: Users with Roles
 *
 * GET /api/strategic/users/with-roles - Get all users with their roles
 *
 * @module app/api/strategic/users/with-roles
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Role, UserWithRoles } from '@/lib/permissions/permission-types';
import { SYSTEM_ROLES } from '@/lib/permissions/permission-types';

export const dynamic = 'force-dynamic';

// Mock users
const mockUsers = [
  { id: 'user-1', name: 'João Silva', email: 'joao.silva@empresa.com', initials: 'JS' },
  { id: 'user-2', name: 'Maria Analista', email: 'maria@empresa.com', initials: 'MA' },
  { id: 'user-3', name: 'Pedro Alves', email: 'pedro@empresa.com', initials: 'PA' },
  { id: 'user-4', name: 'Ana Costa', email: 'ana.costa@empresa.com', initials: 'AC' },
  { id: 'user-5', name: 'Carlos Oliveira', email: 'carlos@empresa.com', initials: 'CO' },
];

// Mock user roles store
const userRolesStore = new Map<string, string[]>();

if (userRolesStore.size === 0) {
  userRolesStore.set('user-1', ['role-1', 'role-2']);
  userRolesStore.set('user-2', ['role-2']);
  userRolesStore.set('user-3', ['role-3']);
  userRolesStore.set('user-4', ['role-4']);
  userRolesStore.set('user-5', ['role-3', 'role-4']);
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();

    let filteredUsers = [...mockUsers];

    if (search) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search)
      );
    }

    const usersWithRoles: UserWithRoles[] = filteredUsers.map((user) => {
      const roleIds = userRolesStore.get(user.id) || [];
      const roles = roleIds
        .map((roleId) => rolesStore.get(roleId))
        .filter((role): role is Role => role !== undefined);

      return {
        ...user,
        roles,
      };
    });

    return NextResponse.json({ users: usersWithRoles });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/users/with-roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
