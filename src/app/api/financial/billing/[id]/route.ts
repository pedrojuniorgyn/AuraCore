import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { billingInvoices } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

import { logger } from '@/shared/infrastructure/logging';
// GET - Buscar fatura específica
export const GET = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const billingId = parseInt(resolvedParams.id);
    if (isNaN(billingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const billing = await queryFirst<typeof billingInvoices.$inferSelect>(
      db
        .select()
        .from(billingInvoices)
        .where(
          and(
            eq(billingInvoices.id, billingId),
            eq(billingInvoices.organizationId, ctx.organizationId),
            isNull(billingInvoices.deletedAt)
          )
        )
        .orderBy(asc(billingInvoices.id))
    );

    if (!billing) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: billing });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao buscar fatura:", error);
    return NextResponse.json(
      { error: "Erro ao buscar fatura" },
      { status: 500 }
    );
  }
});

// PUT - Atualizar fatura
export const PUT = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const billingId = parseInt(resolvedParams.id);
    if (isNaN(billingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.customerId || !body.dueDate) {
      return NextResponse.json(
        { error: "Cliente e data de vencimento são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se fatura existe
    const existing = await queryFirst<typeof billingInvoices.$inferSelect>(db
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.id, billingId),
          eq(billingInvoices.organizationId, ctx.organizationId),
          isNull(billingInvoices.deletedAt)
        )
      )
      .orderBy(asc(billingInvoices.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi finalizada
    if (existing.status === "FINALIZED" || existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar fatura finalizada ou paga" },
        { status: 400 }
      );
    }

    // TODO: Validar mudança de valor se tiver boleto gerado
    // Propriedades boletoId e totalAmount não existem mais no schema atual
    // if (existing.boletoId && body.totalAmount !== existing.totalAmount) {
    //   return NextResponse.json(
    //     { error: "Não é possível alterar valor de fatura com boleto gerado" },
    //     { status: 400 }
    //   );
    // }

    // Atualizar
    await db
      .update(billingInvoices)
      .set({
        ...body,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(billingInvoices.id, billingId), eq(billingInvoices.organizationId, ctx.organizationId)));

    const updated = await queryFirst<typeof billingInvoices.$inferSelect>(db
      .select()
      .from(billingInvoices)
      .where(and(eq(billingInvoices.id, billingId), eq(billingInvoices.organizationId, ctx.organizationId)))
      .orderBy(asc(billingInvoices.id))
      );

    return NextResponse.json({
      success: true,
      message: "Fatura atualizada com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao atualizar fatura:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar fatura" },
      { status: 500 }
    );
  }
});

// DELETE - Soft delete da fatura
export const DELETE = withDI(async (req: NextRequest, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();

    const billingId = parseInt(resolvedParams.id);
    if (isNaN(billingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se fatura existe
    const existing = await queryFirst<typeof billingInvoices.$inferSelect>(db
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.id, billingId),
          eq(billingInvoices.organizationId, ctx.organizationId),
          isNull(billingInvoices.deletedAt)
        )
      )
      .orderBy(asc(billingInvoices.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir fatura já paga" },
        { status: 400 }
      );
    }

    if (existing.status === "FINALIZED") {
      return NextResponse.json(
        { error: "Não é possível excluir fatura finalizada. Cancele-a primeiro." },
        { status: 400 }
      );
    }

    // TODO: Validar exclusão se tiver boleto gerado
    // Propriedade boletoId não existe mais no schema atual
    // if (existing.boletoId) {
    //   return NextResponse.json(
    //     { error: "Não é possível excluir fatura com boleto gerado. Cancele o boleto primeiro." },
    //     { status: 400 }
    //   );
    // }

    // TODO: Excluir CTes vinculados ou desvincular
    // await unlinkCtes(billingId);

    // Soft delete
    await db
      .update(billingInvoices)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(billingInvoices.id, billingId), eq(billingInvoices.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Fatura excluída com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao excluir fatura:", error);
    return NextResponse.json(
      { error: "Erro ao excluir fatura" },
      { status: 500 }
    );
  }
});









