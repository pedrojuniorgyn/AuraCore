/**
 * SCRIPT COMPLETO: Migração PCC (73 contas) + NCM (13 faltantes)
 * 
 * Ação 1: Limpar PCC e carregar 73 contas da migration 0023
 * Ação 2: Migrar 13 NCMs faltantes para pcg_ncm_rules
 */

import dotenv from "dotenv";
import sql from "mssql";
import fs from "fs";
import path from "path";

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
  database: process.env.DB_NAME as string,
  options: { encrypt: false, trustServerCertificate: true },
  port: 1433,
};

async function run() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                    ║");
  console.log("║         🚀 MIGRAÇÃO COMPLETA: PCC (73) + NCM (13)                 ║");
  console.log("║                                                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const pool = await sql.connect(config);

  try {
    // ========================================
    // ETAPA 1: LIMPAR E CARREGAR PCC (73 CONTAS)
    // ========================================
    console.log("📊 ETAPA 1: PCC - Plano de Contas Contábil");
    console.log("─".repeat(70));
    console.log("");

    // 1.1. Contar registros atuais
    const countBefore = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);
    console.log(`📌 Contas PCC atuais: ${countBefore.recordset[0].total}`);

    // 1.2. Fazer soft delete de todas as contas
    console.log("🗑️  Fazendo soft delete das contas existentes...");
    await pool.request().query(`
      UPDATE chart_of_accounts 
      SET deleted_at = GETDATE(), 
          updated_by = 'MIGRATION_SCRIPT',
          updated_at = GETDATE()
      WHERE organization_id = 1 
        AND deleted_at IS NULL
    `);
    console.log("✅ Soft delete concluído");

    // 1.3. Ler migration 0023
    console.log("\n📥 Carregando migration 0023_tms_chart_of_accounts_seed.sql...");
    const migrationPath = path.join(__dirname, "../drizzle/migrations/0023_tms_chart_of_accounts_seed.sql");
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration não encontrada: ${migrationPath}`);
    }

    const migrationContent = fs.readFileSync(migrationPath, "utf8");

    // 1.4. Executar migration
    console.log("⚙️  Executando migration...");
    
    // Split por GO e executar cada bloco
    const blocks = migrationContent.split(/\nGO\n/i);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (block && !block.startsWith("--") && !block.startsWith("PRINT")) {
        try {
          await pool.request().query(block);
        } catch (e: unknown) {
          // Ignora erros de INSERT duplicado (caso já exista)
          if (!e.message.includes("duplicate") && !e.message.includes("Violation of UNIQUE KEY")) {
            console.log(`⚠️  Bloco ${i + 1}: ${e.message.substring(0, 80)}`);
          }
        }
      }
    }

    // 1.5. Verificar resultado
    const countAfter = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    console.log("\n📊 Resultado:");
    console.log(`   Antes: ${countBefore.recordset[0].total} contas`);
    console.log(`   Depois: ${countAfter.recordset[0].total} contas`);

    if (countAfter.recordset[0].total >= 73) {
      console.log("   ✅ Migration 0023 aplicada com sucesso!");
    } else {
      console.log(`   ⚠️  Esperado: 73+ contas, obtido: ${countAfter.recordset[0].total}`);
    }

    // 1.6. Mostrar amostra
    const sample = await pool.request().query(`
      SELECT TOP 10 code, name, type, category 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL 
      ORDER BY code
    `);

    console.log("\n📋 Amostra (10 primeiras contas):");
    sample.recordset.forEach((r: unknown) => {
      console.log(`   ${r.code?.padEnd(20)} ${r.name?.substring(0, 40)}`);
    });

    // ========================================
    // ETAPA 2: MIGRAR 13 NCMs FALTANTES
    // ========================================
    console.log("\n");
    console.log("📊 ETAPA 2: NCMs - Regras Fiscais PCG-NCM");
    console.log("─".repeat(70));
    console.log("");

    const missingNcms = [
      // Lubrificantes
      { ncm: '2710.19.11', desc: 'Óleo de Motor', pcg: 3245, mono: 0, st: 1 },
      { ncm: '2710.19.19', desc: 'Óleo Lubrificante Mineral', pcg: 3245, mono: 0, st: 1 },
      { ncm: '2710.19.90', desc: 'Graxa Lubrificante', pcg: 3245, mono: 0, st: 1 },
      
      // Combustíveis
      { ncm: '2710.19.12', desc: 'Gasolina Automotiva', pcg: 1648, mono: 1, st: 1 },
      { ncm: '2710.19.29', desc: 'Etanol Combustível', pcg: 1648, mono: 1, st: 1 },
      { ncm: '2710.19.31', desc: 'Diesel S500', pcg: 1648, mono: 1, st: 1 },
      
      // Pneus
      { ncm: '4011.30.00', desc: 'Pneus de Borracha Maciça', pcg: 1649, mono: 1, st: 1 },
      { ncm: '4011.62.00', desc: 'Pneus para Ônibus', pcg: 1649, mono: 1, st: 1 },
      
      // Peças Mecânicas
      { ncm: '8409.91.99', desc: 'Motores Diesel - Peças', pcg: 1654, mono: 1, st: 1 },
      
      // Peças Elétricas
      { ncm: '8512.30.00', desc: 'Buzinas Elétricas', pcg: 1657, mono: 1, st: 1 },
      { ncm: '8536.49.00', desc: 'Relés', pcg: 1657, mono: 1, st: 1 },
      { ncm: '8536.90.90', desc: 'Conectores Elétricos', pcg: 1657, mono: 1, st: 1 },
      { ncm: '8708.99.00', desc: 'Peças de Veículos', pcg: 1654, mono: 1, st: 1 },
    ];

    console.log(`📌 NCMs a migrar: ${missingNcms.length}`);
    console.log("");

    let inserted = 0;
    for (const item of missingNcms) {
      try {
        // Verificar se PCG existe
        const pcgExists = await pool.request()
          .input('pcg_id', sql.Int, item.pcg)
          .query(`
            SELECT id FROM management_chart_of_accounts 
            WHERE id = @pcg_id AND organization_id = 1 AND deleted_at IS NULL
          `);

        if (pcgExists.recordset.length === 0) {
          console.log(`⚠️  ${item.ncm} - PCG ${item.pcg} não encontrado, pulando...`);
          continue;
        }

        await pool.request()
          .input('org_id', sql.Int, 1)
          .input('pcg_id', sql.Int, item.pcg)
          .input('ncm', sql.NVarChar, item.ncm)
          .input('desc', sql.NVarChar, item.desc)
          .input('mono', sql.Bit, item.mono)
          .input('st', sql.Bit, item.st)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM pcg_ncm_rules 
              WHERE ncm_code = @ncm AND organization_id = @org_id AND deleted_at IS NULL
            )
            BEGIN
              INSERT INTO pcg_ncm_rules (
                organization_id, pcg_id, ncm_code, ncm_description,
                flag_pis_cofins_monofasico, flag_icms_st,
                priority, is_active, created_by, created_at, updated_at, version
              )
              VALUES (
                @org_id, @pcg_id, @ncm, @desc,
                @mono, @st,
                10, 1, 'MIGRATION_SCRIPT', GETDATE(), GETDATE(), 1
              )
            END
          `);
        
        const mono = item.mono ? '✅ MONO' : '❌';
        const st = item.st ? '✅ ST' : '❌';
        console.log(`✅ ${item.ncm.padEnd(15)} ${item.desc.padEnd(35)} ${mono} ${st}`);
        inserted++;
      } catch (e: unknown) {
        console.log(`❌ ${item.ncm} - Erro: ${e.message.substring(0, 60)}`);
      }
    }

    // Verificar total de regras
    const totalNcm = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM pcg_ncm_rules 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    console.log("\n📊 Resultado NCMs:");
    console.log(`   Inseridos: ${inserted}/${missingNcms.length}`);
    console.log(`   Total PCG-NCM Rules: ${totalNcm.recordset[0].total}`);

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════════╗");
    console.log("║                      ✅ MIGRAÇÃO CONCLUÍDA                         ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝");
    console.log("");
    
    const finalPcc = await pool.request().query(`SELECT COUNT(*) as t FROM chart_of_accounts WHERE organization_id = 1 AND deleted_at IS NULL`);
    const finalPcg = await pool.request().query(`SELECT COUNT(*) as t FROM management_chart_of_accounts WHERE organization_id = 1 AND deleted_at IS NULL`);
    const finalCc = await pool.request().query(`SELECT COUNT(*) as t FROM cost_centers WHERE organization_id = 1 AND deleted_at IS NULL`);
    const finalNcm = await pool.request().query(`SELECT COUNT(*) as t FROM pcg_ncm_rules WHERE organization_id = 1 AND deleted_at IS NULL`);
    
    console.log(`  PCC (Plano Contábil)          → ${finalPcc.recordset[0].t} contas`);
    console.log(`  PCG (Plano Gerencial)         → ${finalPcg.recordset[0].t} contas`);
    console.log(`  CC (Centros de Custo)         → ${finalCc.recordset[0].t} centros`);
    console.log(`  PCG-NCM Rules                 → ${finalNcm.recordset[0].t} regras`);
    console.log("");

    if (finalPcc.recordset[0].t >= 73) {
      console.log("  ✅ PCC: Estrutura completa (73+ contas)");
    } else {
      console.log("  ⚠️  PCC: Estrutura incompleta");
    }

    if (finalNcm.recordset[0].t >= 45) {
      console.log("  ✅ NCM: Estrutura completa (45+ regras)");
    } else {
      console.log("  ⚠️  NCM: Estrutura incompleta");
    }

    console.log("");

  } catch (error: unknown) {
    console.error("\n❌ ERRO:", error.message);
    console.error("\nStack:", error.stack);
    throw error;
  } finally {
    await pool.close();
  }
}

run().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});




