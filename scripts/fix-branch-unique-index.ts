import * as dotenv from "dotenv";
dotenv.config();

import { db, pool } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🔌 Conectando ao SQL Server...");
  if (!pool.connected) {
    await pool.connect();
  }
  console.log("✅ Conectado!\n");

  console.log("🗑️ Removendo índice antigo...");
  try {
    await db.execute(sql.raw(`DROP INDEX [branches_document_org_idx] ON [branches]`));
    console.log("✅ Índice antigo removido!");
  } catch (error: any) {
    console.warn("⚠️ Índice antigo não encontrado ou já foi removido:", error.message);
  }

  console.log("\n🔧 Criando novo índice com filtro de soft delete...");
  try {
    await db.execute(sql.raw(`
      CREATE UNIQUE INDEX [branches_document_org_idx] 
      ON [branches] ([document],[organization_id]) 
      WHERE deleted_at IS NULL
    `));
    console.log("✅ Novo índice criado com sucesso!");
  } catch (error: any) {
    console.error("❌ Erro ao criar índice:", error.message);
  }

  console.log("\n✅ Migração concluída!");
  console.log("📊 Agora o índice único ignora registros deletados (soft delete).");

  await pool.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  pool.close();
  process.exit(1);
});


































