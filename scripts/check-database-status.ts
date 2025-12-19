/**
 * Verifica status atual do banco de dados
 */

import dotenv from "dotenv";
import sql from "mssql";

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

async function checkDatabaseStatus() {
  console.log("🔍 VERIFICANDO STATUS DO BANCO DE DADOS\n");
  
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!\n");

    // Lista todas as tabelas
    const tables = await pool.request().query(`
      SELECT 
        TABLE_NAME as name,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMNS.TABLE_NAME = TABLES.TABLE_NAME) as columns
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    console.log(`📊 Total de tabelas: ${tables.recordset.length}\n`);
    
    const relevantTables = [
      'chart_of_accounts',
      'management_chart_of_accounts',
      'financial_cost_centers',
      'cost_centers',
      'account_mapping',
      'management_journal_entries',
      'management_journal_entry_lines'
    ];

    console.log("🎯 TABELAS RELEVANTES:");
    console.log("=".repeat(60));
    
    for (const tableName of relevantTables) {
      const exists = tables.recordset.find(t => t.name === tableName);
      if (exists) {
        // Conta registros
        try {
          const count = await pool.request().query(`SELECT COUNT(*) as total FROM ${tableName}`);
          console.log(`✅ ${tableName.padEnd(40)} ${count.recordset[0].total} registros`);
        } catch {
          console.log(`⚠️  ${tableName.padEnd(40)} (erro ao contar)`);
        }
      } else {
        console.log(`❌ ${tableName.padEnd(40)} NÃO EXISTE`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📋 TODAS AS TABELAS NO BANCO:");
    console.log("=".repeat(60));
    
    tables.recordset.forEach((t: any) => {
      console.log(`   ${t.name}`);
    });

    // Verifica se há cost_centers vs financial_cost_centers
    console.log("\n" + "=".repeat(60));
    console.log("🔍 INVESTIGAÇÃO DETALHADA:");
    console.log("=".repeat(60));
    
    const costCentersTables = tables.recordset.filter((t: any) => 
      t.name.toLowerCase().includes('cost') || t.name.toLowerCase().includes('centro')
    );
    
    console.log(`\n📌 Tabelas relacionadas a Centro de Custo:`);
    costCentersTables.forEach((t: any) => {
      console.log(`   - ${t.name}`);
    });

    const chartTables = tables.recordset.filter((t: any) => 
      t.name.toLowerCase().includes('chart') || t.name.toLowerCase().includes('account')
    );
    
    console.log(`\n📌 Tabelas relacionadas a Plano de Contas:`);
    chartTables.forEach((t: any) => {
      console.log(`   - ${t.name}`);
    });

  } catch (error: any) {
    console.error("❌ Erro:", error.message);
  } finally {
    await pool.close();
  }
}

checkDatabaseStatus();













