/**
 * Script para resetar a senha do Admin
 */

import dotenv from "dotenv";
import sql from "mssql";
import { hash } from "bcryptjs";

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

async function resetPassword() {
  console.log("🔌 Conectando ao SQL Server...");
  const pool = new sql.ConnectionPool(connectionConfig);
  
  try {
    await pool.connect();
    console.log("✅ Conectado!\n");

    const newPassword = "admin123";
    const hashedPassword = await hash(newPassword, 10);

    console.log("🔐 Resetando senha para: admin123");

    await pool.request().query(`
      UPDATE users
      SET password_hash = '${hashedPassword}',
          updated_at = GETDATE()
      WHERE email = 'admin@auracore.com'
    `);

    console.log("✅ Senha resetada com sucesso!\n");
    console.log("📧 Email: admin@auracore.com");
    console.log("🔒 Senha: admin123");

  } catch (error: unknown) {
    console.error("\n❌ Erro:", error.message);
    process.exit(1);
  } finally {
    await pool.close();
    console.log("\n🔌 Conexão fechada.");
  }
}

resetPassword();





































