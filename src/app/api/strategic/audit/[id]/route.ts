/**
 * API: Strategic Audit Log by ID
 *
 * GET /api/strategic/audit/[id] - Get audit log details
 *
 * @module app/api/strategic/audit/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { AuditLog } from '@/lib/audit/audit-types';

export const dynamic = 'force-dynamic';

// Reference to the same store (in production, use database)
const auditLogsStore: AuditLog[] = [];

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
    const log = auditLogsStore.find((l) => l.id === id);

    if (!log) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }

    return NextResponse.json(log);
  } catch (error) {
    console.error('GET /api/strategic/audit/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
