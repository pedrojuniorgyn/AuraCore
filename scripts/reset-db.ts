import * as dotenv from "dotenv";
dotenv.config();

import { pool } from "../src/lib/db";
import sql from "mssql";

async function main() {
  try {
    console.log("⚠️  ATENÇÃO: Este script vai LIMPAR TODAS AS TABELAS do banco!");
    console.log("🔥 Isso é irreversível! Use apenas em ambiente de DESENVOLVIMENTO.\n");

    if (!pool.connected) {
      console.log("📡 Conectando ao banco...");
      await pool.connect();
      console.log("✅ Conectado!\n");
    }

    console.log("🗑️  Limpando tabelas existentes...\n");

    // Ordem de exclusão respeitando Foreign Keys
    const tables = [
      "audit_logs",
      "user_branches", // Pivot: users <-> branches (Data Scoping)
      "user_roles",
      "role_permissions",
      "sessions",
      "accounts",
      "verificationToken", // IMPORTANTE: Nome correto (sem 's')
      "users",
      "business_partners",
      "branches",
      "products",
      "permissions",
      "roles",
      "organizations", // Por último (é referenciada por outras)
    ];

    for (const table of tables) {
      try {
        await pool.request().query(`
          IF OBJECT_ID('dbo.${table}', 'U') IS NOT NULL
          BEGIN
            DROP TABLE dbo.${table};
            PRINT 'Tabela ${table} excluída.';
          END
          ELSE
          BEGIN
            PRINT 'Tabela ${table} não existe.';
          END
        `);
        console.log(`✅ ${table}`);
      } catch (error) {
        console.log(`⚠️  Erro ao excluir ${table}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ BANCO LIMPO COM SUCESSO!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📋 Próximos Passos:");
    console.log("   1. Execute: npx drizzle-kit generate");
    console.log("   2. Execute: npx drizzle-kit migrate");
    console.log("   3. Execute: npx tsx -r dotenv/config scripts/seed.ts");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao limpar banco:", error);
    process.exit(1);
  }
}

main();

