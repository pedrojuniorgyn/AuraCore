/**
 * Script para executar migração das tabelas de NFe
 * 
 * USO: npx tsx scripts/run-nfe-migration.ts
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

    // Lê o arquivo de migração mais recente (NFe)
    const migrationPath = join(__dirname, "../drizzle/20251205210551_common_darwin/migration.sql");
    
    console.log(`\n📝 Lendo migração: ${migrationPath}\n`);
    
    const sqlScript = readFileSync(migrationPath, "utf-8");

    // Divide por statement breakpoints
    const statements = sqlScript
      .split(/-->.*statement-breakpoint/gi)
      .filter((stmt) => stmt.trim().length > 0);

    console.log(`📊 Total de statements: ${statements.length}\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (statement) {
        try {
          console.log(`[${i + 1}/${statements.length}] Executando...`);
          await pool.request().query(statement);
          console.log(`✅ Statement ${i + 1} executado com sucesso\n`);
        } catch (error: any) {
          console.error(`❌ Erro no statement ${i + 1}:`, error.message);
          console.error(`SQL:\n${statement}\n`);
          
          // Continua mesmo com erro (pode ser constraint já existente)
          if (!error.message.includes("already exists")) {
            throw error;
          }
        }
      }
    }

    console.log("\n✅ Migração concluída!");
    console.log("\n📊 Verificando tabelas criadas...");

    // Verifica se as tabelas foram criadas
    const checkResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('inbound_invoices', 'inbound_invoice_items')
      ORDER BY TABLE_NAME
    `);

    if (checkResult.recordset.length > 0) {
      console.log("\n✅ Tabelas de NFe criadas:");
      console.table(checkResult.recordset);
    } else {
      console.log("\n⚠️  Nenhuma tabela nova encontrada.");
    }

  } catch (error: any) {
    console.error("\n❌ Erro durante migração:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

runMigration();















