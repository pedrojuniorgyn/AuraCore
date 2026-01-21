/**
 * API: Strategic Roles
 *
 * GET /api/strategic/roles - List roles
 * POST /api/strategic/roles - Create role
 *
 * @module app/api/strategic/roles
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Role, Permission } from '@/lib/permissions/permission-types';
import { SYSTEM_ROLES } from '@/lib/permissions/permission-types';

export const dynamic = 'force-dynamic';

// In-memory store for development
const rolesStore = new Map<string, Role>();

// Initialize with system roles
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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = Array.from(rolesStore.values()).sort((a, b) => b.priority - a.priority);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('GET /api/strategic/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = `role-${Date.now()}`;

    const role: Role = {
      id,
      name: body.name,
      description: body.description || '',
      permissions: body.permissions || [],
      isSystem: false,
      isDefault: body.isDefault || false,
      priority: body.priority || 50,
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    rolesStore.set(id, role);

    return NextResponse.json(role);
  } catch (error) {
    console.error('POST /api/strategic/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
