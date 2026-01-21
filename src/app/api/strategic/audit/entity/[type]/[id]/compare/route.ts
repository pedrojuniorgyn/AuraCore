/**
 * API: Compare Entity Versions
 *
 * GET /api/strategic/audit/entity/[type]/[id]/compare - Compare two versions
 *
 * @module app/api/strategic/audit/entity/[type]/[id]/compare
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { VersionComparison, AuditEntityType, AuditChange } from '@/lib/audit/audit-types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await params;
    const { searchParams } = new URL(request.url);
    const fromVersion = parseInt(searchParams.get('from') || '1');
    const toVersion = parseInt(searchParams.get('to') || '2');

    // Mock snapshots
    const fromSnapshot = {
      id,
      name: 'Taxa OTD',
      currentValue: 80 + fromVersion,
      targetValue: fromVersion > 10 ? 95 : 90,
      thresholds: {
        warning: fromVersion > 10 ? 90 : 85,
        critical: fromVersion > 10 ? 85 : 80,
      },
      unit: '%',
      frequency: 'monthly',
    };

    const toSnapshot = {
      id,
      name: 'Taxa OTD',
      currentValue: 80 + toVersion,
      targetValue: toVersion > 10 ? 95 : 90,
      thresholds: {
        warning: toVersion > 10 ? 90 : 85,
        critical: toVersion > 10 ? 85 : 80,
      },
      unit: '%',
      frequency: 'monthly',
    };

    // Calculate changes
    const changes: AuditChange[] = [];

    if (fromSnapshot.currentValue !== toSnapshot.currentValue) {
      changes.push({
        field: 'currentValue',
        fieldLabel: 'Valor Atual',
        previousValue: fromSnapshot.currentValue,
        newValue: toSnapshot.currentValue,
        changeType: 'modified',
      });
    }

    if (fromSnapshot.targetValue !== toSnapshot.targetValue) {
      changes.push({
        field: 'targetValue',
        fieldLabel: 'Meta',
        previousValue: fromSnapshot.targetValue,
        newValue: toSnapshot.targetValue,
        changeType: 'modified',
      });
    }

    if (fromSnapshot.thresholds.warning !== toSnapshot.thresholds.warning) {
      changes.push({
        field: 'thresholds.warning',
        fieldLabel: 'Limite Atenção',
        previousValue: fromSnapshot.thresholds.warning,
        newValue: toSnapshot.thresholds.warning,
        changeType: 'modified',
      });
    }

    if (fromSnapshot.thresholds.critical !== toSnapshot.thresholds.critical) {
      changes.push({
        field: 'thresholds.critical',
        fieldLabel: 'Limite Crítico',
        previousValue: fromSnapshot.thresholds.critical,
        newValue: toSnapshot.thresholds.critical,
        changeType: 'modified',
      });
    }

    const comparison: VersionComparison = {
      entityType: type as AuditEntityType,
      entityId: id,
      fromVersion,
      toVersion,
      changes,
      fromSnapshot,
      toSnapshot,
    };

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('GET /api/strategic/audit/entity/[type]/[id]/compare error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
