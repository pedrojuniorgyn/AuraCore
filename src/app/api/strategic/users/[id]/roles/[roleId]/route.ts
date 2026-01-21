/**
 * API: Remove Role from User
 *
 * DELETE /api/strategic/users/[id]/roles/[roleId] - Remove role
 *
 * @module app/api/strategic/users/[id]/roles/[roleId]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Reference the same store
const userRolesStore = new Map<string, string[]>();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, roleId } = await params;
    const currentRoles = userRolesStore.get(id) || [];
    userRolesStore.set(id, currentRoles.filter((r) => r !== roleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/strategic/users/[id]/roles/[roleId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
