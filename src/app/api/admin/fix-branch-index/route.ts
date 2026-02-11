import { NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { sql } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * POST /api/admin/fix-branch-index
 * Atualiza o índice único de branches para considerar soft delete
 */
export const POST = withDI(async () => {
  try {
    await ensureConnection();

    logger.info("🗑️ Removendo índice antigo...");
    try {
      await db.execute(sql.raw(`DROP INDEX [branches_document_org_idx] ON [branches]`));
      logger.info("✅ Índice antigo removido!");
    } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("⚠️ Índice antigo não encontrado:", errorMessage);
    }

    logger.info("🔧 Criando novo índice com filtro...");
    await db.execute(sql.raw(`
      CREATE UNIQUE INDEX [branches_document_org_idx] 
      ON [branches] ([document],[organization_id]) 
      WHERE deleted_at IS NULL
    `));
    logger.info("✅ Novo índice criado!");

    return NextResponse.json({
      success: true,
      message: "Índice atualizado com sucesso! Agora soft delete funciona corretamente.",
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao atualizar índice:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar índice", details: errorMessage },
      { status: 500 }
    );
  }
});



































