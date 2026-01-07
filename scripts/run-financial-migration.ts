import sql from "mssql";
import * as fs from "fs";
import * as path from "path";

const dbConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function runFinancialMigration() {
  console.log("📡 Conectando ao banco...");
  const pool = await sql.connect(dbConfig);
  console.log("✅ Conectado!\n");

  try {
    const migrationPath = path.join(
      process.cwd(),
      "drizzle/migrations/0006_financial_module.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Executa o SQL completo
    console.log("📋 Executando migration do módulo financeiro...\n");
    await pool.request().query(migrationSQL);

    console.log("\n✅ Migration do módulo financeiro executada com sucesso!");
  } catch (error: unknown) {
    console.error("\n❌ ERRO na migration:", error.message);
    throw error;
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

runFinancialMigration().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});

