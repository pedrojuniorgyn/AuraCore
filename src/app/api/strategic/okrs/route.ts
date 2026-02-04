/**
 * API Routes: /api/strategic/okrs
 * 
 * ⚠️ BUG-002: Store centralizado para evitar fetch interno (erro SSL)
 * ⚠️ TEMPORÁRIO: Mock data até implementação DDD completa
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAllOkrs } from '@/lib/okrs/mock-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.getAll('level');
  const status = searchParams.getAll('status');
  const ownerId = searchParams.get('ownerId');
  const parentId = searchParams.get('parentId');
  const search = searchParams.get('search');

  let okrs = getAllOkrs();

  // Apply filters
  if (level.length > 0) {
    okrs = okrs.filter((o) => level.includes(o.level));
  }
  if (status.length > 0) {
    okrs = okrs.filter((o) => status.includes(o.status));
  }
  if (ownerId) {
    okrs = okrs.filter((o) => o.ownerId === ownerId);
  }
  if (parentId !== null) {
    if (parentId === 'null') {
      okrs = okrs.filter((o) => !o.parentId);
    } else {
      okrs = okrs.filter((o) => o.parentId === parentId);
    }
  }
  if (search) {
    const searchLower = search.toLowerCase();
    okrs = okrs.filter(
      (o) =>
        o.title.toLowerCase().includes(searchLower) ||
        o.description?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by level priority then title
  const levelOrder = { corporate: 0, department: 1, team: 2, individual: 3 };
  okrs.sort((a, b) => {
    const levelDiff = levelOrder[a.level] - levelOrder[b.level];
    if (levelDiff !== 0) return levelDiff;
    return a.title.localeCompare(b.title);
  });

  return NextResponse.json({ okrs });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newOKR = {
      id: globalThis.crypto.randomUUID(), // UUID real ao invés de string
      title: body.title,
      description: body.description,
      level: body.level || 'department',
      parentId: body.parentId,
      periodType: body.periodType || 'quarter',
      periodLabel: body.periodLabel || 'Q1 2026',
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : new Date(),
      ownerId: body.ownerId,
      ownerName: body.ownerName,
      ownerType: body.ownerType || 'user',
      keyResults: [],
      progress: 0,
      status: body.status || 'draft',
      organizationId: body.organizationId || 1,
      branchId: body.branchId || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: body.createdBy || 'user-unknown',
    };

    const { createOkr } = await import('@/lib/okrs/mock-store');
    createOkr(newOKR);

    return NextResponse.json(newOKR, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating OKR:', error);
    return NextResponse.json({ error: 'Failed to create OKR' }, { status: 500 });
  }
}
