/**
 * API: Restore Deleted Entity
 *
 * POST /api/strategic/audit/entity/[type]/[id]/restore - Restore a soft-deleted entity
 *
 * @module app/api/strategic/audit/entity/[type]/[id]/restore
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await params;

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
    console.error('POST /api/strategic/audit/entity/[type]/[id]/restore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
