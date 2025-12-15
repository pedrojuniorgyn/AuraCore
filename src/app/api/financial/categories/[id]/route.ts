import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { financialCategories } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { and, eq, isNull, sql } from "drizzle-orm";

/**
 * PUT /api/financial/categories/[id]
 * Atualiza uma categoria financeira
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const { id } = await context.params;
    const body = await request.json();
    const { name, code, type, description, status, isActive } = body ?? {};

    const categoryId = Number.parseInt(id, 10);
    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const nextStatus =
      typeof status === "string"
        ? status
        : typeof isActive === "boolean"
          ? (isActive ? "ACTIVE" : "INACTIVE")
          : undefined;

    const setPayload: Record<string, any> = {
      updatedBy: ctx.userId,
      updatedAt: new Date(),
      version: sql<number>`${financialCategories.version} + 1`,
    };

    if (typeof name === "string") setPayload.name = name;
    if (typeof code === "string") setPayload.code = code || null;
    if (typeof type === "string") setPayload.type = type;
    if (typeof description === "string") setPayload.description = description || null;
    if (typeof nextStatus === "string") setPayload.status = nextStatus;

    const result = await db
      .update(financialCategories)
      .set(setPayload)
      .where(
        and(
          eq(financialCategories.id, categoryId),
          eq(financialCategories.organizationId, ctx.organizationId),
          isNull(financialCategories.deletedAt)
        )
      );

    const rows = (result as any)?.rowsAffected?.[0] ?? 0;
    if (rows === 0) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao atualizar categoria:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/financial/categories/[id]
 * Soft delete com validações de integridade
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const { id } = await context.params;
    const categoryId = parseInt(id, 10);

    // Buscar categoria para mensagens detalhadas
    const categoryResult = await db.execute(sql`
      SELECT name, code 
      FROM financial_categories 
      WHERE id = ${categoryId}
        AND organization_id = ${ctx.organizationId}
        AND deleted_at IS NULL
    `);

    if (!categoryResult[0]) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    const category = categoryResult[0];

    // ✅ VALIDAÇÃO 1: Verificar uso em itens de documentos fiscais
    const fiscalItemsResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM fiscal_document_items 
      WHERE category_id = ${categoryId}
        AND deleted_at IS NULL
    `);
    const fiscalItemsCount = fiscalItemsResult[0]?.count || 0;

    if (fiscalItemsCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Categoria "${category.name}" está vinculada a ${fiscalItemsCount} item(ns) de documento(s) fiscal(is).`,
          code: "HAS_FISCAL_ITEMS",
          count: fiscalItemsCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar a categoria (Status = INACTIVE)."
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 2: Verificar uso em contas a pagar
    const payablesResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM accounts_payable 
      WHERE category_id = ${categoryId}
        AND deleted_at IS NULL
    `);
    const payablesCount = payablesResult[0]?.count || 0;

    if (payablesCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Categoria "${category.name}" está vinculada a ${payablesCount} conta(s) a pagar.`,
          code: "HAS_PAYABLES",
          count: payablesCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar a categoria."
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 3: Verificar uso em contas a receber
    const receivablesResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM accounts_receivable 
      WHERE category_id = ${categoryId}
        AND deleted_at IS NULL
    `);
    const receivablesCount = receivablesResult[0]?.count || 0;

    if (receivablesCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Categoria "${category.name}" está vinculada a ${receivablesCount} conta(s) a receber.`,
          code: "HAS_RECEIVABLES",
          count: receivablesCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar a categoria."
        },
        { status: 400 }
      );
    }

    // ✅ Se passou em todas validações, permite soft delete
    await db.execute(sql`
      UPDATE financial_categories
      SET 
        deleted_at = GETDATE(),
        status = 'INACTIVE',
        updated_by = ${ctx.userId}
      WHERE id = ${categoryId}
        AND organization_id = ${ctx.organizationId}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao excluir categoria:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

