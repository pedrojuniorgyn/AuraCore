/**
 * Script para executar MIGRATIONS de PCC, PCG e CENTROS DE CUSTO
 * 
 * Executa as migrations 0023, 0024, 0025 e 0026 que contêm:
 * - 0023: PCC (100+ contas analíticas TMS)
 * - 0024: Centro de Custo 3D
 * - 0025: PCG (Plano de Contas Gerencial)
 * - 0026: Centros de Custo Base (10 CCs)
 * 
 * USO: npx tsx scripts/run-pcc-pcg-cc-migrations.ts
 */

import dotenv from "dotenv";
import sql from "mssql";
import { readFileSync } from "fs";
import { join } from "path";

dotenv.config();

const connectionConfig: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
  database: process.env.DB_NAME as string,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  port: 1433,
};

const MIGRATIONS_TO_RUN = [
  {
    name: "0023_tms_chart_of_accounts_seed",
    file: "0023_tms_chart_of_accounts_seed.sql",
    description: "PCC - 100+ Contas Analíticas TMS"
  },
  {
    name: "0024_cost_center_3d",
    file: "0024_cost_center_3d.sql",
    description: "Centro de Custo 3D (Dimensões)"
  },
  {
    name: "0025_management_chart_of_accounts",
    file: "0025_management_chart_of_accounts.sql",
    description: "PCG - Plano de Contas Gerencial"
  },
  {
    name: "0026_enterprise_complete_structure",
    file: "0026_enterprise_complete_structure.sql",
    description: "Centros de Custo Base (10 CCs)"
  }
];

async function runPccPcgCcMigrations() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║                                                       ║");
  console.log("║  🚀 EXECUTANDO MIGRATIONS PCC, PCG E CC 🚀           ║");
  console.log("║                                                       ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  
  console.log("\n🔌 Conectando ao SQL Server...");
  console.log(`   Server: ${connectionConfig.server}`);
  console.log(`   Database: ${connectionConfig.database}`);
  
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado com sucesso!");

    let totalExecuted = 0;
    let totalSkipped = 0;

    for (const migration of MIGRATIONS_TO_RUN) {
      console.log("\n" + "=".repeat(60));
      console.log(`📁 MIGRATION: ${migration.name}`);
      console.log(`📝 ${migration.description}`);
      console.log("=".repeat(60));
      
      try {
        const migrationPath = join(__dirname, "../drizzle/migrations", migration.file);
        const sqlScript = readFileSync(migrationPath, "utf-8");

        // Remove comentários e divide em statements
        const statements = sqlScript
          .split(/GO\s*$/gim)
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));

        console.log(`\n📊 Total de statements: ${statements.length}`);

        let executed = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          
          if (statement.trim()) {
            try {
              await pool.request().query(statement);
              executed++;
              process.stdout.write(`\r   ✅ Executando: ${i + 1}/${statements.length}`);
            } catch (error: any) {
              // Ignora erros de "já existe"
              if (
                error.message.includes("already exists") ||
                error.message.includes("There is already an object") ||
                error.message.includes("Cannot insert duplicate") ||
                error.message.includes("Violation of UNIQUE KEY")
              ) {
                skipped++;
                process.stdout.write(`\r   ⏭️  Ignorando: ${i + 1}/${statements.length}`);
              } else {
                errors++;
                console.error(`\n   ❌ Erro no statement ${i + 1}:`, error.message.substring(0, 200));
              }
            }
          }
        }

        console.log(`\n\n   📊 Resultado:`);
        console.log(`      ✅ Executados: ${executed}`);
        console.log(`      ⏭️  Ignorados: ${skipped}`);
        console.log(`      ❌ Erros: ${errors}`);

        totalExecuted += executed;
        totalSkipped += skipped;

      } catch (error: any) {
        console.error(`   ❌ Erro ao ler migration:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO GERAL");
    console.log("=".repeat(60));
    console.log(`✅ Total Executado: ${totalExecuted} statements`);
    console.log(`⏭️  Total Ignorado: ${totalSkipped} statements`);
    console.log("=".repeat(60));

    // Verifica contas criadas
    console.log("\n🔍 VERIFICANDO DADOS CRIADOS...\n");

    try {
      const pccCount = await pool.request().query(`
        SELECT COUNT(*) as total FROM chart_of_accounts WHERE organization_id = 1
      `);
      console.log(`✅ PCC (chart_of_accounts): ${pccCount.recordset[0].total} contas`);
    } catch (e) {
      console.log("⚠️  PCC (chart_of_accounts): Tabela não existe ainda");
    }

    try {
      const pcgCount = await pool.request().query(`
        SELECT COUNT(*) as total FROM management_chart_of_accounts WHERE organization_id = 1
      `);
      console.log(`✅ PCG (management_chart_of_accounts): ${pcgCount.recordset[0].total} contas`);
    } catch (e) {
      console.log("⚠️  PCG (management_chart_of_accounts): Tabela não existe ainda");
    }

    try {
      const ccCount = await pool.request().query(`
        SELECT COUNT(*) as total FROM financial_cost_centers WHERE organization_id = 1
      `);
      console.log(`✅ CC (financial_cost_centers): ${ccCount.recordset[0].total} centros`);
    } catch (e) {
      console.log("⚠️  CC (financial_cost_centers): Tabela não existe ainda");
    }

    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║                                                       ║");
    console.log("║  ✅ MIGRATIONS EXECUTADAS COM SUCESSO! ✅            ║");
    console.log("║                                                       ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

  } catch (error: any) {
    console.error("\n❌ Erro durante execução:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("🔌 Conexão fechada.\n");
  }
}

runPccPcgCcMigrations();
