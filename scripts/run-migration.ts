import * as dotenv from "dotenv";
dotenv.config();

import sql from "mssql";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const pool = new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });

  try {
    console.log("📡 Conectando ao banco...");
    await pool.connect();
    console.log("✅ Conectado!\n");

    const migrationFile = path.join(__dirname, "../drizzle/20251205123518_colossal_sheva_callister/migration.sql");
    const migrationSQL = fs.readFileSync(migrationFile, "utf-8");

    // Divide em statements (separados por --> statement-breakpoint)
    const statements = migrationSQL.split("--> statement-breakpoint").filter(s => s.trim());

    console.log(`📋 Executando ${statements.length} statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      // Pega as primeiras 60 caracteres para preview
      const preview = statement.substring(0, 80).replace(/\n/g, " ").trim();
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executando: ${preview}...`);
        await pool.request().query(statement);
        console.log(`✅ Sucesso\n`);
      } catch (error: any) {
        console.error(`\n❌ ERRO no statement ${i + 1}:`);
        console.error(`Statement: ${preview}...`);
        console.error(`Erro: ${error.message}\n`);
        console.error(`SQL completo:\n${statement}\n`);
        process.exit(1);
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ MIGRATION APLICADA COM SUCESSO!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

main();


















