import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { db } from "@/lib/db";
import { accountsReceivable } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";
import { z } from "zod";
import { idParamSchema } from "@/lib/validation/common-schemas";

import { logger } from '@/shared/infrastructure/logging';
const updateReceivableSchema = z.object({
  partnerId: z.number().int().positive().optional(),
  customerId: z.number().int().positive().optional(), // Alias for partnerId
  categoryId: z.number().int().positive().optional(),
  costCenterId: z.number().int().positive().optional().nullable(),
  chartAccountId: z.number().int().positive().optional().nullable(),
  description: z.string().optional(),
  documentNumber: z.string().optional().nullable(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  amount: z.string().or(z.number()).transform((val) => String(val)).optional(),
  notes: z.string().optional().nullable(),
});

// GET - Buscar conta a receber específica
export const GET = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const paramValidation = idParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const receivableId = paramValidation.data.id;

    const receivable = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, ctx.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      .orderBy(asc(accountsReceivable.id))
      );

    if (!receivable) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: receivable });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao buscar conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta a receber" },
      { status: 500 }
    );
  }
});

// PUT - Atualizar conta a receber
export const PUT = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const paramValidation = idParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const receivableId = paramValidation.data.id;

    const body = await req.json();

    // Validação Zod
    const validation = updateReceivableSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const partnerId = data.partnerId || data.customerId;

    // Verificar se conta existe
    const existing = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, ctx.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      .orderBy(asc(accountsReceivable.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi recebida
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar conta já recebida" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Partial<typeof accountsReceivable.$inferInsert> = {
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    };

    if (partnerId) updateData.partnerId = partnerId;
    if (data.categoryId) updateData.categoryId = data.categoryId;
    if (data.costCenterId !== undefined) updateData.costCenterId = data.costCenterId;
    if (data.chartAccountId !== undefined) updateData.chartAccountId = data.chartAccountId;
    if (data.description) updateData.description = data.description;
    if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber;
    if (data.issueDate) updateData.issueDate = data.issueDate;
    if (data.dueDate) updateData.dueDate = data.dueDate;
    if (data.amount) updateData.amount = data.amount;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Atualizar
    await db
      .update(accountsReceivable)
      .set(updateData)
      .where(and(eq(accountsReceivable.id, receivableId), eq(accountsReceivable.organizationId, ctx.organizationId)));

    const updated = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(and(eq(accountsReceivable.id, receivableId), eq(accountsReceivable.organizationId, ctx.organizationId)))
      .orderBy(asc(accountsReceivable.id))
      );

    return NextResponse.json({
      success: true,
      message: "Conta a receber atualizada com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao atualizar conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta a receber" },
      { status: 500 }
    );
  }
});

// DELETE - Soft delete da conta a receber
export const DELETE = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const paramValidation = idParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const receivableId = paramValidation.data.id;

    // Verificar se conta existe
    const existing = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, ctx.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      .orderBy(asc(accountsReceivable.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir conta já recebida" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(accountsReceivable)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(accountsReceivable.id, receivableId), eq(accountsReceivable.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Conta a receber excluída com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao excluir conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta a receber" },
      { status: 500 }
    );
  }
});
