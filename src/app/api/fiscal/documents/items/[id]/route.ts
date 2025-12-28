import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * 🔧 PATCH /api/fiscal/documents/items/:id
 * 
 * Atualiza categorização de um item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);
    const body = await request.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.categoryId !== undefined) {
      updates.push(`category_id = ${body.categoryId || "NULL"}`);
    }
    if (body.chartAccountId !== undefined) {
      updates.push(`chart_account_id = ${body.chartAccountId || "NULL"}`);
    }
    if (body.costCenterId !== undefined) {
      updates.push(`cost_center_id = ${body.costCenterId || "NULL"}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    await db.execute(sql.raw(`
      UPDATE fiscal_document_items
      SET ${updates.join(", ")},
          updated_at = GETDATE(),
          updated_by = ${session.user.id}
      WHERE id = ${itemId}
    `));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao atualizar item:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}























