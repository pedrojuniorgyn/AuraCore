/**
 * API Route: Rejeitar Ideia
 * 
 * POST /api/strategic/ideas/[id]/reject
 * 
 * @module api/strategic/ideas/[id]/reject
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
        { error: 'Apenas ideias pendentes ou em revisão podem ser rejeitadas' },
        { status: 400 }
      );
    }

    // Obter motivo do body se fornecido
    let reviewNotes = 'Não atende aos critérios estratégicos';
    try {
      const body = await request.json();
      if (body.reason) {
        reviewNotes = body.reason;
      }
    } catch {
      // Body vazio é ok
    }

    // Atualizar status
    await db
      .update(ideaBoxTable)
      .set({
        status: 'REJECTED',
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(ideaBoxTable.id, id));

    return NextResponse.json({ success: true, message: 'Ideia rejeitada' });
  } catch (error) {
    console.error('Erro ao rejeitar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
