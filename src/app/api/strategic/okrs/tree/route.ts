/**
 * API Routes: /api/strategic/okrs/tree
 * 
 * Task 04: Migrated from Mock Store to DDD Repository
 * Uses DrizzleOkrRepository via DI Container
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import type { OKRTreeNode } from '@/lib/okrs/okr-types';
import { getTenantContext } from '@/lib/auth/context';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di';
import type { IOkrRepository } from '@/modules/strategic/okr/domain/ports/output/IOkrRepository';
import { OKR_TOKENS } from '@/modules/strategic/okr/infrastructure/di/tokens';
import type { OKR } from '@/modules/strategic/okr/domain/entities/OKR';

// Ensure DI container is registered
registerStrategicModule();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    // Get tenant context (multi-tenancy)
    const tenantCtx = await getTenantContext();

    // Resolve Repository via DI
    const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);

    // Fetch all OKRs for this tenant
    const result = await repository.findMany({
      organizationId: tenantCtx.organizationId,
      branchId: tenantCtx.branchId,
    });

    // Filter by period if specified
    let filteredOKRs = result.items;
    if (period) {
      filteredOKRs = result.items.filter((okr) => okr.periodLabel === period);
    }

    // Build tree structure
    const okrMap = new Map<string, OKRTreeNode>();

    // First pass: create tree nodes with Domain Entity data
    filteredOKRs.forEach((okr) => {
      const treeNode: OKRTreeNode = {
        id: okr.id,
        title: okr.title,
        description: okr.description,
        level: okr.level,
        parentId: okr.parentId,
        periodType: okr.periodType,
        periodLabel: okr.periodLabel,
        startDate: okr.startDate,
        endDate: okr.endDate,
        ownerId: okr.ownerId,
        ownerName: okr.ownerName,
        ownerType: okr.ownerType,
        keyResults: okr.keyResults as unknown as OKRTreeNode['keyResults'],
        progress: okr.progress,
        status: okr.status,
        organizationId: okr.organizationId,
        branchId: okr.branchId,
        createdBy: okr.createdBy,
        createdAt: okr.createdAt,
        updatedAt: okr.updatedAt,
        children: [],
        depth: 0,
        isExpanded: true,
      };
      okrMap.set(okr.id, treeNode);
    });

    // Second pass: build parent-child relationships
    const rootNodes: OKRTreeNode[] = [];

    filteredOKRs.forEach((okr) => {
      const node = okrMap.get(okr.id);
      if (!node) return;

      if (okr.parentId && okrMap.has(okr.parentId)) {
        const parent = okrMap.get(okr.parentId);
        if (parent) {
          node.depth = parent.depth + 1;
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Sort by level and progress
    const sortNodes = (nodes: OKRTreeNode[]): OKRTreeNode[] => {
      return nodes
        .sort((a, b) => b.progress - a.progress)
        .map((node) => ({
          ...node,
          children: sortNodes(node.children),
        }));
    };

    const tree = sortNodes(rootNodes);

    return NextResponse.json({ tree });
  } catch (error) {
    // Propagate auth errors (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('[GET /api/strategic/okrs/tree] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OKRs tree' },
      { status: 500 }
    );
  }
}
