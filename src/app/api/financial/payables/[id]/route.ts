import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";
import { z } from "zod";
import { uuidParamSchema } from "@/lib/validation/common-schemas";

import { logger } from '@/shared/infrastructure/logging';
const updatePayableSchema = z.object({
  partnerId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(), // Alias for partnerId
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

// GET - Buscar conta a pagar específica
export const GET = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const paramValidation = uuidParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const payableId = paramValidation.data.id;

    const payable = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .orderBy(asc(accountsPayable.id))
      );

    if (!payable) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: payable });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao buscar conta a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta a pagar" },
      { status: 500 }
    );
  }
});

// PUT - Atualizar conta a pagar
export const PUT = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const paramValidation = uuidParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const payableId = paramValidation.data.id;

    const body = await req.json();

    // Validação Zod
    const validation = updatePayableSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    
    // Handle alias supplierId -> partnerId
    const partnerId = data.partnerId || data.supplierId;

    // Verificar se conta existe
    const existing = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .orderBy(asc(accountsPayable.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi paga
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar conta já paga" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Partial<typeof accountsPayable.$inferInsert> = {
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
      .update(accountsPayable)
      .set(updateData)
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)));

    const updated = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)))
      .orderBy(asc(accountsPayable.id))
      );

    return NextResponse.json({
      success: true,
      message: "Conta a pagar atualizada com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao atualizar conta a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta a pagar" },
      { status: 500 }
    );
  }
});

// DELETE - Soft delete da conta a pagar
export const DELETE = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const paramValidation = uuidParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const payableId = paramValidation.data.id;

    // Verificar se conta existe
    const existing = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .orderBy(asc(accountsPayable.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir conta já paga" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(accountsPayable)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Conta a pagar excluída com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao excluir conta a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta a pagar" },
      { status: 500 }
    );
  }
});
