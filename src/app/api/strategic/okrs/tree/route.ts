/**
 * API Routes: /api/strategic/okrs/tree
 * 
 * ⚠️ BUG-002: Store centralizado para evitar fetch interno (erro SSL)
 * ⚠️ TEMPORÁRIO: Mock data até implementação DDD completa
 */
import { NextRequest, NextResponse } from 'next/server';
import type { OKRTreeNode } from '@/lib/okrs/okr-types';
import { getAllOkrs } from '@/lib/okrs/mock-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');

  // Buscar OKRs do store centralizado (sem fetch interno)
  const okrs = getAllOkrs();

  // Filter by period if specified
  let filteredOKRs = okrs;
  if (period) {
    filteredOKRs = okrs.filter((o) => o.periodLabel === period);
  }

  // Build tree structure
  const okrMap = new Map<string, OKRTreeNode>();

  // First pass: create tree nodes
  filteredOKRs.forEach((okr) => {
    const treeNode: OKRTreeNode = {
      ...okr,
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
}
