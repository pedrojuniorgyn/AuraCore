/**
 * API Route: Aprovar Ideia
 * 
 * POST /api/strategic/ideas/[id]/approve
 * 
 * @module api/strategic/ideas/[id]/approve
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ideaBoxTable } from '@/modules/strategic/infrastructure/persistence/schemas/idea-box.schema';
import { getTenantContext } from '@/lib/auth/context';
import { eq, and, isNull } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se ideia existe e pertence ao tenant
    const existing = await db
      .select()
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.id, id),
          eq(ideaBoxTable.organizationId, ctx.organizationId),
          eq(ideaBoxTable.branchId, ctx.branchId),
          isNull(ideaBoxTable.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

    const idea = existing[0];

    if (idea.status !== 'SUBMITTED' && idea.status !== 'UNDER_REVIEW') {
      return NextResponse.json(
        { error: 'Apenas ideias pendentes ou em revisão podem ser aprovadas' },
        { status: 400 }
      );
    }

    // Atualizar status
    await db
      .update(ideaBoxTable)
      .set({
        status: 'APPROVED',
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ideaBoxTable.id, id));

    return NextResponse.json({ success: true, message: 'Ideia aprovada' });
  } catch (error) {
    console.error('Erro ao aprovar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
