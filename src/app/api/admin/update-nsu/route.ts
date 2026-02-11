import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * 🔧 ATUALIZAR NSU DA FILIAL
 * 
 * Quando SEFAZ retorna erro 656, use o ultNSU retornado
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const body = await request.json();
    const { branchId, newNsu } = body;

    if (!branchId || !newNsu) {
      return NextResponse.json(
        { error: "branchId e newNsu são obrigatórios" },
        { status: 400 }
      );
    }

    logger.info(`🔧 Atualizando NSU da filial ${branchId} para: ${newNsu}`);

    await db
      .update(branches)
      .set({
        lastNsu: newNsu,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, branchId));

    logger.info("✅ NSU atualizado com sucesso!");

    return NextResponse.json({
      success: true,
      message: `NSU atualizado para ${newNsu}`,
    });

  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
































