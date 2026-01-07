/**
 * Script para verificar dados na tabela branches
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

async function checkData() {
  console.log("🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!\n");

    // Busca todas as filiais
    const result = await pool.request().query(`
      SELECT 
        id,
        organization_id,
        name,
        document,
        deleted_at,
        certificate_pfx,
        last_nsu,
        environment
      FROM branches
      WHERE deleted_at IS NULL
    `);

    console.log(`📋 Filiais cadastradas: ${result.recordset.length}\n`);

    interface BranchRow {
      id: number;
      organization_id: number;
      name: string;
      document: string;
      certificate_pfx?: Buffer | null;
      last_nsu?: string | null;
      environment?: string | null;
    }
    
    if (result.recordset.length > 0) {
      console.table(
        (result.recordset as BranchRow[]).map((b) => ({
          ID: b.id,
          Org: b.organization_id,
          Nome: b.name,
          CNPJ: b.document,
          "Tem Cert": b.certificate_pfx ? "Sim" : "Não",
          NSU: b.last_nsu || "0",
          Ambiente: b.environment || "HOMOLOGATION",
        }))
      );
    } else {
      console.log("❌ NENHUMA FILIAL ENCONTRADA!");
      console.log("\n💡 Execute o seed para criar dados de teste:");
      console.log("   npx tsx scripts/seed.ts");
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Erro:", errorMessage);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

checkData();





































