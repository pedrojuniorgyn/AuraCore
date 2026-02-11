import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import type { RouteContext } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

import { logger } from '@/shared/infrastructure/logging';
/**
 * 🔧 PATCH /api/fiscal/documents/items/:id
 * 
 * Atualiza categorização de um item
 */
export const PATCH = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const { id } = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const itemId = parseInt(id);
    const body = await request.json();

    const updates: string[] = [];
    const values: unknown[] = [];

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
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao atualizar item:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});






























