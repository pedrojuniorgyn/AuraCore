/**
 * Script para executar migração manual dos campos de produtos
 * 
 * USO: npx tsx scripts/run-product-migration.ts
 */

import dotenv from "dotenv";
import sql from "mssql";
import { readFileSync } from "fs";
import { join } from "path";

dotenv.config();

const connectionConfig: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME as string,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function runMigration() {
  console.log("🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!");

    // Lê o arquivo SQL
    const sqlScript = readFileSync(
      join(__dirname, "add-product-fields.sql"),
      "utf-8"
    );

    console.log("\n📝 Executando script de migração...\n");

    // Divide o script por GO
    const statements = sqlScript
      .split(/\nGO\n/gi)
      .filter((stmt) => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const result = await pool.request().query(statement);
          
          // Exibe mensagens de PRINT do SQL Server
          if (result.recordset && result.recordset.length > 0) {
            console.log(result.recordset[0]);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`❌ Erro ao executar statement:`, message);
        }
      }
    }

    console.log("\n✅ Migração concluída com sucesso!");
    console.log("\n📊 Verificando colunas adicionadas...");

    // Verifica se as colunas foram adicionadas
    const checkResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'products'
      AND COLUMN_NAME IN ('ncm', 'origin', 'weight_kg', 'price_cost', 'price_sale')
      ORDER BY COLUMN_NAME
    `);

    if (checkResult.recordset.length > 0) {
      console.log("\n✅ Colunas adicionadas:");
      console.table(checkResult.recordset);
    } else {
      console.log("\n⚠️  Nenhuma coluna nova encontrada.");
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro durante migração:", message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

runMigration();





































