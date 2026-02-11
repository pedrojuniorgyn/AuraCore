/**
 * API Route: Rejeitar Ideia
 * 
 * POST /api/strategic/ideas/[id]/reject
 * 
 * @module api/strategic/ideas/[id]/reject
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ideaBoxTable } from '@/modules/strategic/infrastructure/persistence/schemas/idea-box.schema';
import { getTenantContext } from '@/lib/auth/context';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
const idSchema = z.string().uuid();
const RejectReasonSchema = z
  .object({
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .optional();

const parseRowsAffected = (result: unknown): number => {
  const raw = (result as Record<string, unknown> | undefined)?.rowsAffected;
  if (Array.isArray(raw)) {
    return Number(raw[0] ?? 0);
  }
  return Number(raw ?? 0);
};

export const POST = withDI(async (
  request: Request,
  context: RouteContext
) => {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Obter motivo do body se fornecido
    let reviewNotes = 'Não atende aos critérios estratégicos';
    try {
      const body = await request.json();
      const parsed = RejectReasonSchema.safeParse(body);
      if (parsed.success && parsed.data?.reason) {
        reviewNotes = parsed.data.reason;
      }
    } catch {
      // Body vazio é ok
    }

    // Atualizar status
    const updateResult = await db
      .update(ideaBoxTable)
      .set({
        status: 'REJECTED',
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewNotes,
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
        { error: 'Apenas ideias pendentes ou em revisão podem ser rejeitadas' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Ideia rejeitada' });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Erro ao rejeitar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});
