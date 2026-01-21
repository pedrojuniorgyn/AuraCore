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
    const role = rolesStore.get(id);

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error('GET /api/strategic/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
    console.error('PATCH /api/strategic/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
    console.error('DELETE /api/strategic/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
