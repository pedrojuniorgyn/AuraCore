/**
 * Script para executar SEEDS de PCC, PCG e CENTROS DE CUSTO
 * Executa SQL completo de uma vez
 * 
 * USO: npx tsx scripts/execute-seeds-direct.ts
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

async function executeSeedsDirect() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║                                                       ║");
  console.log("║  🌱 EXECUTANDO SEEDS PCC, PCG E CC 🌱               ║");
  console.log("║                                                       ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  
  console.log("\n🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado com sucesso!\n");

    // 1. Executar 0023 - PCC (100+ contas)
    console.log("=" .repeat(60));
    console.log("📝 EXECUTANDO: 0023_tms_chart_of_accounts_seed.sql");
    console.log("   PCC - 100+ Contas Analíticas TMS");
    console.log("=".repeat(60));
    
    try {
      const sql023 = readFileSync(
        join(__dirname, "../drizzle/migrations/0023_tms_chart_of_accounts_seed.sql"),
        "utf-8"
      );
      
      await pool.request().query(sql023);
      console.log("✅ PCC: Seeds executados com sucesso!");
      
      // Verifica
      const pccResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM chart_of_accounts WHERE organization_id = 1
      `);
      console.log(`   📊 Total de contas PCC: ${pccResult.recordset[0].total}\n`);
      
    } catch (error: any) {
      if (error.message.includes("duplicate") || error.message.includes("Violation")) {
        console.log("⚠️  Alguns registros já existem (OK)\n");
      } else {
        console.error("❌ Erro:", error.message.substring(0, 300), "\n");
      }
    }

    // 2. Executar 0024 - CC 3D
    console.log("=".repeat(60));
    console.log("📝 EXECUTANDO: 0024_cost_center_3d.sql");
    console.log("   Centro de Custo 3D (Dimensões)");
    console.log("=".repeat(60));
    
    try {
      const sql024 = readFileSync(
        join(__dirname, "../drizzle/migrations/0024_cost_center_3d.sql"),
        "utf-8"
      );
      
      await pool.request().query(sql024);
      console.log("✅ CC 3D: Estrutura criada com sucesso!\n");
      
    } catch (error: any) {
      if (error.message.includes("already") || error.message.includes("duplicate")) {
        console.log("⚠️  Estrutura já existe (OK)\n");
      } else {
        console.error("❌ Erro:", error.message.substring(0, 300), "\n");
      }
    }

    // 3. Executar 0025 - PCG
    console.log("=".repeat(60));
    console.log("📝 EXECUTANDO: 0025_management_chart_of_accounts.sql");
    console.log("   PCG - Plano de Contas Gerencial");
    console.log("=".repeat(60));
    
    try {
      const sql025 = readFileSync(
        join(__dirname, "../drizzle/migrations/0025_management_chart_of_accounts.sql"),
        "utf-8"
      );
      
      await pool.request().query(sql025);
      console.log("✅ PCG: Estrutura e seeds criados com sucesso!");
      
      // Verifica
      const pcgResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM management_chart_of_accounts WHERE organization_id = 1
      `);
      console.log(`   📊 Total de contas PCG: ${pcgResult.recordset[0].total}\n`);
      
    } catch (error: any) {
      if (error.message.includes("already") || error.message.includes("duplicate")) {
        console.log("⚠️  Estrutura já existe (OK)\n");
      } else {
        console.error("❌ Erro:", error.message.substring(0, 300), "\n");
      }
    }

    // 4. Executar 0026 - Centros de Custo Base
    console.log("=".repeat(60));
    console.log("📝 EXECUTANDO: 0026_enterprise_complete_structure.sql");
    console.log("   Centros de Custo Base (10 CCs)");
    console.log("=".repeat(60));
    
    try {
      const sql026 = readFileSync(
        join(__dirname, "../drizzle/migrations/0026_enterprise_complete_structure.sql"),
        "utf-8"
      );
      
      // Divide em batches menores (arquivo muito grande)
      const batches = sql026.split(/GO\s*$/gim);
      
      let executed = 0;
      for (const batch of batches) {
        if (batch.trim()) {
          try {
            await pool.request().query(batch);
            executed++;
          } catch (e: any) {
            if (!e.message.includes("already") && !e.message.includes("duplicate")) {
              console.error(`⚠️  ${e.message.substring(0, 100)}`);
            }
          }
        }
      }
      
      console.log(`✅ Centros de Custo: ${executed} batches executados!`);
      
      // Verifica
      const ccResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM financial_cost_centers WHERE organization_id = 1
      `);
      console.log(`   📊 Total de CCs: ${ccResult.recordset[0].total}\n`);
      
    } catch (error: any) {
      console.error("❌ Erro:", error.message.substring(0, 300), "\n");
    }

    // VERIFICAÇÃO FINAL
    console.log("\n" + "=".repeat(60));
    console.log("🔍 VERIFICAÇÃO FINAL");
    console.log("=".repeat(60));

    const finalPcc = await pool.request().query(`
      SELECT COUNT(*) as total FROM chart_of_accounts WHERE organization_id = 1
    `);
    console.log(`✅ PCC: ${finalPcc.recordset[0].total} contas`);

    try {
      const finalPcg = await pool.request().query(`
        SELECT COUNT(*) as total FROM management_chart_of_accounts WHERE organization_id = 1
      `);
      console.log(`✅ PCG: ${finalPcg.recordset[0].total} contas`);
    } catch {
      console.log(`⚠️  PCG: Tabela não criada`);
    }

    try {
      const finalCc = await pool.request().query(`
        SELECT COUNT(*) as total FROM financial_cost_centers WHERE organization_id = 1
      `);
      console.log(`✅ CC: ${finalCc.recordset[0].total} centros`);
    } catch {
      console.log(`⚠️  CC: Tabela não criada`);
    }

    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║                                                       ║");
    console.log("║  ✅ SEEDS EXECUTADOS! ✅                             ║");
    console.log("║                                                       ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

  } catch (error: any) {
    console.error("\n❌ Erro fatal:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("🔌 Conexão fechada.\n");
  }
}

executeSeedsDirect();
