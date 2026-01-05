/**
 * Script para executar TODAS as migrações pendentes
 * 
 * USO: npx tsx scripts/run-all-migrations.ts
 */

import dotenv from "dotenv";
import sql from "mssql";
import { readdirSync, readFileSync } from "fs";
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

async function runAllMigrations() {
  console.log("🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!");

    // Lê todas as pastas de migração
    const drizzlePath = join(__dirname, "../drizzle");
    const migrationDirs = readdirSync(drizzlePath)
      .filter((dir) => !dir.startsWith("."))
      .sort(); // Ordena cronologicamente

    console.log(`\n📂 Encontradas ${migrationDirs.length} migrações:\n`);

    for (const dir of migrationDirs) {
      const migrationPath = join(drizzlePath, dir, "migration.sql");
      
      console.log(`\n📝 Processando: ${dir}`);
      
      try {
        const sqlScript = readFileSync(migrationPath, "utf-8");

        // Divide por statement breakpoints
        const statements = sqlScript
          .split(/-->.*statement-breakpoint/gi)
          .filter((stmt) => stmt.trim().length > 0);

        console.log(`   📊 Total de statements: ${statements.length}`);

        let executed = 0;
        let skipped = 0;

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await pool.request().query(statement);
              executed++;
            } catch (error: any) {
              // Ignora erros de "já existe"
              if (
                error.message.includes("already exists") ||
                error.message.includes("There is already an object")
              ) {
                skipped++;
              } else {
                console.error(`   ❌ Erro:`, error.message);
              }
            }
          }
        }

        console.log(`   ✅ Executados: ${executed} | Ignorados: ${skipped}`);

      } catch (error: any) {
        console.error(`   ❌ Erro ao ler migração:`, error.message);
      }
    }

    console.log("\n✅ Todas as migrações foram processadas!");
    console.log("\n📊 Verificando estrutura final do banco...");

    // Lista todas as tabelas
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    console.log("\n✅ Tabelas no banco:");
    console.table(tablesResult.recordset);

  } catch (error: any) {
    console.error("\n❌ Erro durante migrações:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

runAllMigrations();




































