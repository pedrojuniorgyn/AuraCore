import { NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/admin/fix-branch-index
 * Atualiza o índice único de branches para considerar soft delete
 */
export async function POST() {
  try {
    await ensureConnection();

    console.log("🗑️ Removendo índice antigo...");
    try {
      await db.execute(sql.raw(`DROP INDEX [branches_document_org_idx] ON [branches]`));
      console.log("✅ Índice antigo removido!");
    } catch (error: any) {
      console.warn("⚠️ Índice antigo não encontrado:", error.message);
    }

    console.log("🔧 Criando novo índice com filtro...");
    await db.execute(sql.raw(`
      CREATE UNIQUE INDEX [branches_document_org_idx] 
      ON [branches] ([document],[organization_id]) 
      WHERE deleted_at IS NULL
    `));
    console.log("✅ Novo índice criado!");

    return NextResponse.json({
      success: true,
      message: "Índice atualizado com sucesso! Agora soft delete funciona corretamente.",
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar índice:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar índice", details: error.message },
      { status: 500 }
    );
  }
}













