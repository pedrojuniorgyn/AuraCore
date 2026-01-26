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
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { z } from 'zod';

const idSchema = z.string().uuid();

const parseRowsAffected = (result: unknown): number => {
  const raw = (result as Record<string, unknown> | undefined)?.rowsAffected;
  if (Array.isArray(raw)) {
    return Number(raw[0] ?? 0);
  }
  return Number(raw ?? 0);
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const updateResult = await db
      .update(ideaBoxTable)
      .set({
        status: 'APPROVED',
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ideaBoxTable.id, id),
          eq(ideaBoxTable.organizationId, ctx.organizationId),
          eq(ideaBoxTable.branchId, ctx.branchId),
          isNull(ideaBoxTable.deletedAt),
          inArray(ideaBoxTable.status, ['SUBMITTED', 'UNDER_REVIEW'])
        )
      );

    const rowsAffected = parseRowsAffected(updateResult);
    if (!rowsAffected) {
      const [existing] = await db
        .select({ status: ideaBoxTable.status })
        .from(ideaBoxTable)
        .where(
          and(
            eq(ideaBoxTable.id, id),
            eq(ideaBoxTable.organizationId, ctx.organizationId),
            eq(ideaBoxTable.branchId, ctx.branchId),
            isNull(ideaBoxTable.deletedAt)
          )
        );

      if (!existing) {
        return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Apenas ideias pendentes ou em revisão podem ser aprovadas' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Ideia aprovada' });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Erro ao aprovar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
