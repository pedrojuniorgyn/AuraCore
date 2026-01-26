/**
 * API Route: Strategic Idea Detail
 * 
 * GET /api/strategic/ideas/[id] - Busca ideia por ID
 * PUT /api/strategic/ideas/[id] - Atualiza ideia
 * DELETE /api/strategic/ideas/[id] - Remove ideia (soft delete)
 * 
 * @module api/strategic/ideas/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ideaBoxTable } from '@/modules/strategic/infrastructure/persistence/schemas/idea-box.schema';
import { getTenantContext } from '@/lib/auth/context';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const ideaTenantFilter = (
  ctx: { organizationId: number; branchId: number },
  id: string
) =>
  and(
    eq(ideaBoxTable.id, id),
    eq(ideaBoxTable.organizationId, ctx.organizationId),
    eq(ideaBoxTable.branchId, ctx.branchId),
    isNull(ideaBoxTable.deletedAt)
  );

// Schema de validação para atualização
const UpdateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  department: z.string().max(100).optional(),
  estimatedImpact: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [idea] = await db
      .select()
      .from(ideaBoxTable)
      .where(ideaTenantFilter(ctx, id));

    if (!idea) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

    return NextResponse.json(idea);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Erro ao buscar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validar input
    const validation = UpdateIdeaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Verificar se ideia existe
    const [existing] = await db
      .select({ id: ideaBoxTable.id })
      .from(ideaBoxTable)
      .where(ideaTenantFilter(ctx, id));

    if (!existing) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

    // Atualizar
    await db
      .update(ideaBoxTable)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(ideaTenantFilter(ctx, id));

    // Retornar atualizado
    const [updated] = await db
      .select()
      .from(ideaBoxTable)
      .where(ideaTenantFilter(ctx, id));

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Erro ao atualizar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se ideia existe
    const [existing] = await db
      .select({ id: ideaBoxTable.id })
      .from(ideaBoxTable)
      .where(ideaTenantFilter(ctx, id));

    if (!existing) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

    // Soft delete
    await db
      .update(ideaBoxTable)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(ideaTenantFilter(ctx, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Erro ao deletar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
