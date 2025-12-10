/**
 * Script para POPULAR PCC, PCG e CENTROS DE CUSTO
 * Executa INSERT por INSERT
 * 
 * USO: npx tsx scripts/populate-pcc-pcg-cc.ts
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

function cleanSql(sqlText: string): string {
  return sqlText
    .replace(/GO\s*$/gim, "") // Remove GO
    .replace(/TRUE/gi, '1') // TRUE -> 1
    .replace(/FALSE/gi, '0') // FALSE -> 0
    .replace(/--.*$/gm, '') // Remove comentários
    .replace(/PRINT\s+'[^']*';/gi, '') // Remove PRINT statements
    .trim();
}

function extractInserts(sqlText: string): string[] {
  const cleaned = cleanSql(sqlText);
  const inserts: string[] = [];
  
  // Procura por blocos INSERT INTO ... VALUES
  const insertRegex = /INSERT\s+INTO\s+[\w\[\]]+\s*\([^)]+\)\s*(?:SELECT\s+\*\s+FROM\s+\()?VALUES\s*\([^;]*?\)(?:\s+AS\s+[\w\[\]]+\([^)]+\))?(?:\s+WHERE[^;]*)?;?/gis;
  
  let match;
  while ((match = insertRegex.exec(cleaned)) !== null) {
    inserts.push(match[0].trim());
  }
  
  return inserts;
}

async function populatePccPcgCc() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║                                                       ║");
  console.log("║  🌱 POPULANDO PCC, PCG E CC 🌱                       ║");
  console.log("║                                                       ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  
  console.log("\n🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!\n");

    let totalExecuted = 0;
    let totalSkipped = 0;

    // 1. PCC - 100+ contas
    console.log("=".repeat(60));
    console.log("📝 1/3: PCC - Contas Analíticas TMS");
    console.log("=".repeat(60));
    
    try {
      const sql023 = readFileSync(
        join(__dirname, "../drizzle/migrations/0023_tms_chart_of_accounts_seed.sql"),
        "utf-8"
      );
      
      const inserts = extractInserts(sql023);
      console.log(`   📊 Encontrados ${inserts.length} blocos INSERT`);
      
      let executed = 0;
      let skipped = 0;
      
      for (const insert of inserts) {
        try {
          await pool.request().query(insert);
          executed++;
          process.stdout.write(`\r   ✅ Executando: ${executed}/${inserts.length}`);
        } catch (error: any) {
          if (error.message.includes("duplicate") || error.message.includes("Violation")) {
            skipped++;
          } else {
            console.error(`\n   ❌ ${error.message.substring(0, 150)}`);
          }
        }
      }
      
      console.log(`\n   ✅ ${executed} executados | ⏭️  ${skipped} ignorados\n`);
      totalExecuted += executed;
      totalSkipped += skipped;
      
      // Verifica
      const result = await pool.request().query(`
        SELECT COUNT(*) as total FROM chart_of_accounts WHERE organization_id = 1
      `);
      console.log(`   📊 Total PCC no banco: ${result.recordset[0].total} contas\n`);
      
    } catch (error: any) {
      console.error("   ❌ Erro:", error.message, "\n");
    }

    // 2. PCG - Plano Gerencial
    console.log("=".repeat(60));
    console.log("📝 2/3: PCG - Plano de Contas Gerencial");
    console.log("=".repeat(60));
    
    try {
      const sql025 = readFileSync(
        join(__dirname, "../drizzle/migrations/0025_management_chart_of_accounts.sql"),
        "utf-8"
      );
      
      // Primeiro cria as tabelas
      const cleaned = cleanSql(sql025);
      const creates = cleaned.match(/CREATE\s+TABLE[^;]+;/gis) || [];
      const indexes = cleaned.match(/CREATE\s+(?:UNIQUE\s+)?INDEX[^;]+;/gis) || [];
      
      console.log(`   📊 ${creates.length} tabelas, ${indexes.length} índices`);
      
      for (const create of creates) {
        try {
          await pool.request().query(create);
        } catch (e: any) {
          if (!e.message.includes("already")) {
            console.error(`   ⚠️  ${e.message.substring(0, 100)}`);
          }
        }
      }
      
      for (const index of indexes) {
        try {
          await pool.request().query(index);
        } catch (e: any) {
          if (!e.message.includes("already")) {
            console.error(`   ⚠️  ${e.message.substring(0, 100)}`);
          }
        }
      }
      
      // Depois insere dados
      const inserts = extractInserts(sql025);
      console.log(`   📊 ${inserts.length} INSERTs`);
      
      let executed = 0;
      for (const insert of inserts) {
        try {
          await pool.request().query(insert);
          executed++;
        } catch (e: any) {
          if (!e.message.includes("duplicate")) {
            console.error(`   ⚠️  ${e.message.substring(0, 100)}`);
          }
        }
      }
      
      console.log(`   ✅ ${executed} executados\n`);
      totalExecuted += executed;
      
      // Verifica
      const result = await pool.request().query(`
        SELECT COUNT(*) as total FROM management_chart_of_accounts WHERE organization_id = 1
      `);
      console.log(`   📊 Total PCG no banco: ${result.recordset[0].total} contas\n`);
      
    } catch (error: any) {
      console.error("   ❌ Erro:", error.message, "\n");
    }

    // 3. Centros de Custo
    console.log("=".repeat(60));
    console.log("📝 3/3: Centros de Custo Base");
    console.log("=".repeat(60));
    
    try {
      // Primeiro altera a tabela com CC 3D
      const sql024 = readFileSync(
        join(__dirname, "../drizzle/migrations/0024_cost_center_3d.sql"),
        "utf-8"
      );
      
      const alters = cleanSql(sql024).match(/ALTER\s+TABLE[^;]+;/gis) || [];
      console.log(`   📊 ${alters.length} ALTERs para CC 3D`);
      
      for (const alter of alters) {
        try {
          await pool.request().query(alter);
        } catch (e: any) {
          if (!e.message.includes("already") && !e.message.includes("duplicate")) {
            console.error(`   ⚠️  ${e.message.substring(0, 100)}`);
          }
        }
      }
      
      // Depois insere os CCs
      const sql026 = readFileSync(
        join(__dirname, "../drizzle/migrations/0026_enterprise_complete_structure.sql"),
        "utf-8"
      );
      
      const inserts = extractInserts(sql026);
      console.log(`   📊 ${inserts.length} INSERTs`);
      
      let executed = 0;
      for (const insert of inserts) {
        try {
          await pool.request().query(insert);
          executed++;
        } catch (e: any) {
          if (!e.message.includes("duplicate")) {
            console.error(`   ⚠️  ${e.message.substring(0, 100)}`);
          }
        }
      }
      
      console.log(`   ✅ ${executed} executados\n`);
      totalExecuted += executed;
      
      // Verifica
      const result = await pool.request().query(`
        SELECT COUNT(*) as total FROM financial_cost_centers WHERE organization_id = 1
      `);
      console.log(`   📊 Total CC no banco: ${result.recordset[0].total} centros\n`);
      
    } catch (error: any) {
      console.error("   ❌ Erro:", error.message.substring(0, 200), "\n");
    }

    // RESULTADO FINAL
    console.log("\n" + "=".repeat(60));
    console.log("🎉 RESULTADO FINAL");
    console.log("=".repeat(60));
    console.log(`✅ Total executado: ${totalExecuted} INSERTs`);
    console.log(`⏭️  Total ignorado: ${totalSkipped} duplicados`);
    console.log("=".repeat(60) + "\n");

    // Verificação completa
    const pcc = await pool.request().query(`SELECT COUNT(*) as t FROM chart_of_accounts WHERE organization_id = 1`);
    console.log(`📊 PCC: ${pcc.recordset[0].t} contas`);
    
    try {
      const pcg = await pool.request().query(`SELECT COUNT(*) as t FROM management_chart_of_accounts WHERE organization_id = 1`);
      console.log(`📊 PCG: ${pcg.recordset[0].t} contas`);
    } catch { console.log(`⚠️  PCG: Tabela não existe`); }
    
    try {
      const cc = await pool.request().query(`SELECT COUNT(*) as t FROM financial_cost_centers WHERE organization_id = 1`);
      console.log(`📊 CC: ${cc.recordset[0].t} centros`);
    } catch { console.log(`⚠️  CC: Tabela não existe`); }

    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║                                                       ║");
    console.log("║  ✅ POPULAÇÃO CONCLUÍDA! ✅                          ║");
    console.log("║                                                       ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

  } catch (error: any) {
    console.error("\n❌ Erro fatal:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

populatePccPcgCc();
