/**
 * SCRIPT CORRIGIDO: Carregar 73 contas PCC da migration 0023
 * 
 * Problema anterior: A migration não foi executada corretamente
 * Solução: Extrair cada INSERT e executar individualmente
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
  console.log("\n🔧 CORRIGINDO PCC - Carregando 73 contas\n");

  const pool = await sql.connect(config);

  try {
    // Ler migration
    const migrationPath = path.join(__dirname, "../drizzle/migrations/0023_tms_chart_of_accounts_seed.sql");
    const content = fs.readFileSync(migrationPath, "utf8");

    // Extrair todos os VALUES de INSERT INTO chart_of_accounts
    const insertRegex = /INSERT INTO chart_of_accounts[^V]+VALUES\s+([\s\S]*?);/gi;
    const matches = content.matchAll(insertRegex);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const match of matches) {
      const valuesBlock = match[1];
      
      // Split por linha que começa com (
      const rows = valuesBlock.split(/\n(?=\()/);
      
      for (const row of rows) {
        const cleanRow = row.trim().replace(/,\s*$/, ''); // Remove vírgula final
        
        if (!cleanRow || cleanRow.length < 10) continue;

        try {
          await pool.request().query(`
            INSERT INTO chart_of_accounts (
              organization_id, code, name, type, category, parent_id, 
              level, is_analytical, status, created_by, updated_by
            )
            VALUES ${cleanRow}
          `);
          
          totalInserted++;
          process.stdout.write(`\r   Inserido: ${totalInserted} contas`);
        } catch (e: unknown) {
          if (e.message.includes("duplicate") || e.message.includes("Violation of UNIQUE KEY")) {
            // Já existe, pula
            totalInserted++;
            process.stdout.write(`\r   Inserido: ${totalInserted} contas`);
          } else {
            totalErrors++;
            console.log(`\n   ❌ Erro: ${e.message.substring(0, 80)}`);
          }
        }
      }
    }

    console.log(`\n\n✅ Inserção concluída:`);
    console.log(`   Total inserido: ${totalInserted}`);
    console.log(`   Erros: ${totalErrors}`);

    // Verificar resultado
    const result = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    console.log(`\n📊 Total de contas PCC no banco: ${result.recordset[0].total}`);

    if (result.recordset[0].total >= 73) {
      console.log("✅ Migration 0023 aplicada com sucesso!\n");
    } else {
      console.log(`⚠️  Esperado: 73+ contas, obtido: ${result.recordset[0].total}\n`);
    }

    // Mostrar amostra
    const sample = await pool.request().query(`
      SELECT TOP 15 code, name, type 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL 
      ORDER BY code
    `);

    console.log("📋 Amostra (15 primeiras):");
    sample.recordset.forEach((r: unknown) => {
      console.log(`   ${r.code?.padEnd(20)} ${r.name?.substring(0, 45)}`);
    });
    console.log("");

  } catch (error: unknown) {
    console.error("\n❌ ERRO:", error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

run().catch(console.error);




