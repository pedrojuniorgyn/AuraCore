import { NextRequest, NextResponse } from 'next/server';
import type { OKR, OKRTreeNode } from '@/lib/okrs/okr-types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');

  // Fetch all OKRs
  const baseUrl = new URL('/api/strategic/okrs', request.url);
  const response = await fetch(baseUrl.toString());
  const { okrs } = await response.json() as { okrs: OKR[] };

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
