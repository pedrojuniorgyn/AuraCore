/**
 * Script para verificar estrutura da tabela branches
 */

import dotenv from "dotenv";
import sql from "mssql";

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

async function checkStructure() {
  console.log("🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!\n");

    // Lista colunas da tabela branches
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'branches'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("📋 Estrutura da tabela 'branches':\n");
    console.table(result.recordset);

    // Verifica se já tem os campos de certificado
    const hasCertFields = result.recordset.some(
      (col: any) => col.COLUMN_NAME === "certificate_pfx"
    );

    console.log(
      hasCertFields
        ? "\n✅ Campos de certificado JÁ EXISTEM"
        : "\n❌ Campos de certificado NÃO EXISTEM"
    );

  } catch (error: any) {
    console.error("\n❌ Erro:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

checkStructure();















