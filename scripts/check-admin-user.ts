/**
 * Script para verificar se o usuário Admin existe
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

async function checkAdmin() {
  console.log("🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!\n");

    // Busca usuário admin
    const result = await pool.request().query(`
      SELECT 
        id,
        email,
        name,
        role,
        organization_id,
        default_branch_id,
        deleted_at
      FROM users
      WHERE email = 'admin@auracore.com'
    `);

    if (result.recordset.length === 0) {
      console.log("❌ USUÁRIO ADMIN NÃO ENCONTRADO!");
      console.log("\n💡 Execute o seed para criar:");
      console.log("   npx tsx scripts/seed.ts");
    } else {
      const admin = result.recordset[0];
      
      console.log("✅ Usuário Admin encontrado:\n");
      console.table([{
        ID: admin.id,
        Email: admin.email,
        Nome: admin.name,
        Role: admin.role,
        "Org ID": admin.organization_id,
        "Branch ID": admin.default_branch_id,
        Deletado: admin.deleted_at ? "SIM" : "NÃO",
      }]);

      if (admin.deleted_at) {
        console.log("\n⚠️  USUÁRIO ESTÁ DELETADO (soft delete)!");
      }
    }

    // Verifica user_branches
    const branchesResult = await pool.request().query(`
      SELECT ub.branch_id, b.name
      FROM user_branches ub
      LEFT JOIN branches b ON b.id = ub.branch_id
      WHERE ub.user_id = (SELECT id FROM users WHERE email = 'admin@auracore.com')
    `);

    if (branchesResult.recordset.length > 0) {
      console.log("\n📋 Filiais permitidas:");
      console.table(branchesResult.recordset.map((b: any) => ({
        "Branch ID": b.branch_id,
        "Nome": b.name || "N/A",
      })));
    } else {
      console.log("\n⚠️  Nenhuma filial vinculada ao usuário!");
    }

  } catch (error: any) {
    console.error("\n❌ Erro:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

checkAdmin();































