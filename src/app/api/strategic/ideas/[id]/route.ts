/**
 * API Route: Strategic Idea Detail
 * 
 * GET /api/strategic/ideas/[id] - Busca ideia por ID
 * PUT /api/strategic/ideas/[id] - Atualiza ideia
 * DELETE /api/strategic/ideas/[id] - Remove ideia (soft delete)
 * 
 * @module api/strategic/ideas/[id]
 */
import { NextResponse } from 'next/server';
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
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  department: z.string().trim().max(100).optional(),
  estimatedImpact: z.string().trim().max(500).optional(),
});

const idSchema = z.string().uuid();

const parseRowsAffected = (result: unknown): number => {
  const raw = (result as Record<string, unknown> | undefined)?.rowsAffected;
  if (Array.isArray(raw)) {
    return Number(raw[0] ?? 0);
  }
  return Number(raw ?? 0);
};

const buildUpdatePayload = (data: z.infer<typeof UpdateIdeaSchema>) => {
  const payload: Partial<typeof ideaBoxTable.$inferInsert> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.importance !== undefined) payload.importance = data.importance;
  if (data.urgency !== undefined) payload.urgency = data.urgency;
  if (data.department !== undefined) payload.department = data.department;
  if (data.estimatedImpact !== undefined) payload.estimatedImpact = data.estimatedImpact;
  return payload;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validar input
    const validation = UpdateIdeaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updatePayload = buildUpdatePayload(validation.data);
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const updateResult = await db
      .update(ideaBoxTable)
      .set({
        ...updatePayload,
        updatedAt: new Date(),
      })
      .where(ideaTenantFilter(ctx, id));

    const rowsAffected = parseRowsAffected(updateResult);
    if (!rowsAffected) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Soft delete
    const deleteResult = await db
      .update(ideaBoxTable)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(ideaTenantFilter(ctx, id));

    const rowsAffected = parseRowsAffected(deleteResult);
    if (!rowsAffected) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

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
