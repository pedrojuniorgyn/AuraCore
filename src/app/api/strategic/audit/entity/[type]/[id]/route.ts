/**
 * API: Entity History
 *
 * GET /api/strategic/audit/entity/[type]/[id] - Get entity version history
 *
 * @module app/api/strategic/audit/entity/[type]/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { EntityHistory, EntityVersion, AuditEntityType } from '@/lib/audit/audit-types';

export const dynamic = 'force-dynamic';

// Mock version history
function generateMockHistory(
  entityType: AuditEntityType,
  entityId: string
): EntityHistory {
  const versions: EntityVersion[] = [];

  for (let i = 12; i >= 1; i--) {
    versions.push({
      version: i,
      snapshot: {
        id: entityId,
        name: 'Taxa OTD',
        currentValue: 80 + i,
        targetValue: i > 10 ? 95 : 90,
        unit: '%',
      },
      changes:
        i < 12
          ? [
              {
                field: 'currentValue',
                fieldLabel: 'Valor Atual',
                previousValue: 80 + i - 1,
                newValue: 80 + i,
                changeType: 'modified',
              },
            ]
          : [],
      userId: `user-${(i % 4) + 1}`,
      userName: ['João Silva', 'Maria Santos', 'Pedro Alves', 'Ana Costa'][i % 4],
      reason:
        i === 12
          ? 'Atualização mensal'
          : i === 11
            ? 'Ajuste de meta Q1'
            : i === 10
              ? 'Reset automático'
              : undefined,
      createdAt: new Date(Date.now() - (12 - i) * 24 * 60 * 60 * 1000),
    });
  }

  return {
    entityType,
    entityId,
    entityName: 'Taxa OTD',
    currentVersion: 12,
    versions: versions.slice(0, 10),
    total: versions.length,
  };
}

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
    const history = generateMockHistory(type as AuditEntityType, id);

    return NextResponse.json(history);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/audit/entity/[type]/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
