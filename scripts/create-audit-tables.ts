/**
 * 🔐 CRIAR TABELAS DE AUDIT TRAIL (Black Box)
 * 
 * Cria tabelas append-only (imutáveis) para auditoria de operações críticas:
 * - chart_accounts_audit
 * - financial_categories_audit  
 * - cost_centers_audit
 */

import dotenv from "dotenv";
import sql from "mssql";

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
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("🔐 CRIAR TABELAS DE AUDIT TRAIL (Black Box)");
  console.log("═══════════════════════════════════════════════════════\n");

  const pool = await sql.connect(config);

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. chart_accounts_audit
    // ═══════════════════════════════════════════════════════════════
    console.log("📝 1/3 - Criando chart_accounts_audit...");

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'chart_accounts_audit')
      BEGIN
        CREATE TABLE chart_accounts_audit (
          id INT IDENTITY(1,1) PRIMARY KEY,
          chart_account_id INT NOT NULL,
          operation NVARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
          
          -- Valores ANTES da mudança
          old_code NVARCHAR(20),
          old_name NVARCHAR(255),
          old_type NVARCHAR(20),
          old_status NVARCHAR(20),
          old_category NVARCHAR(50),
          old_is_analytical BIT,
          
          -- Valores DEPOIS da mudança
          new_code NVARCHAR(20),
          new_name NVARCHAR(255),
          new_type NVARCHAR(20),
          new_status NVARCHAR(20),
          new_category NVARCHAR(50),
          new_is_analytical BIT,
          
          -- Auditoria (Quem, Quando, Por quê)
          changed_by NVARCHAR(255) NOT NULL, -- user_id
          changed_at DATETIME2 DEFAULT GETDATE(),
          reason NVARCHAR(500), -- Motivo da mudança
          ip_address NVARCHAR(50),
          user_agent NVARCHAR(500)
        );

        -- Índices para performance
        CREATE INDEX IX_chart_accounts_audit_account 
          ON chart_accounts_audit(chart_account_id);
          
        CREATE INDEX IX_chart_accounts_audit_date 
          ON chart_accounts_audit(changed_at DESC);
          
        CREATE INDEX IX_chart_accounts_audit_user 
          ON chart_accounts_audit(changed_by);

        PRINT '   ✅ chart_accounts_audit criada';
      END
      ELSE
      BEGIN
        PRINT '   ⚠️  chart_accounts_audit já existe';
      END
    `);

    // ═══════════════════════════════════════════════════════════════
    // 2. financial_categories_audit
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📝 2/3 - Criando financial_categories_audit...");

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'financial_categories_audit')
      BEGIN
        CREATE TABLE financial_categories_audit (
          id INT IDENTITY(1,1) PRIMARY KEY,
          category_id INT NOT NULL,
          operation NVARCHAR(10) NOT NULL,
          
          old_name NVARCHAR(255),
          old_code NVARCHAR(50),
          old_type NVARCHAR(20),
          old_status NVARCHAR(20),
          
          new_name NVARCHAR(255),
          new_code NVARCHAR(50),
          new_type NVARCHAR(20),
          new_status NVARCHAR(20),
          
          changed_by NVARCHAR(255) NOT NULL,
          changed_at DATETIME2 DEFAULT GETDATE(),
          reason NVARCHAR(500),
          ip_address NVARCHAR(50)
        );

        CREATE INDEX IX_financial_categories_audit_category 
          ON financial_categories_audit(category_id);
          
        CREATE INDEX IX_financial_categories_audit_date 
          ON financial_categories_audit(changed_at DESC);

        PRINT '   ✅ financial_categories_audit criada';
      END
      ELSE
      BEGIN
        PRINT '   ⚠️  financial_categories_audit já existe';
      END
    `);

    // ═══════════════════════════════════════════════════════════════
    // 3. cost_centers_audit
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📝 3/3 - Criando cost_centers_audit...");

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'cost_centers_audit')
      BEGIN
        CREATE TABLE cost_centers_audit (
          id INT IDENTITY(1,1) PRIMARY KEY,
          cost_center_id INT NOT NULL,
          operation NVARCHAR(10) NOT NULL,
          
          old_code NVARCHAR(20),
          old_name NVARCHAR(255),
          old_type NVARCHAR(20),
          old_status NVARCHAR(20),
          old_class NVARCHAR(20),
          
          new_code NVARCHAR(20),
          new_name NVARCHAR(255),
          new_type NVARCHAR(20),
          new_status NVARCHAR(20),
          new_class NVARCHAR(20),
          
          changed_by NVARCHAR(255) NOT NULL,
          changed_at DATETIME2 DEFAULT GETDATE(),
          reason NVARCHAR(500),
          ip_address NVARCHAR(50)
        );

        CREATE INDEX IX_cost_centers_audit_center 
          ON cost_centers_audit(cost_center_id);
          
        CREATE INDEX IX_cost_centers_audit_date 
          ON cost_centers_audit(changed_at DESC);

        PRINT '   ✅ cost_centers_audit criada';
      END
      ELSE
      BEGIN
        PRINT '   ⚠️  cost_centers_audit já existe';
      END
    `);

    // ═══════════════════════════════════════════════════════════════
    // 4. Verificar resultado
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📊 Verificando tabelas criadas...\n");

    const check = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('chart_accounts_audit', 'financial_categories_audit', 'cost_centers_audit')
      ORDER BY TABLE_NAME
    `);

    console.log(`✅ SUCESSO! ${check.recordset.length}/3 tabelas criadas:\n`);
    check.recordset.forEach((t: unknown) => {
      if (typeof t === 'object' && t !== null && 'TABLE_NAME' in t) {
        console.log(`   ✅ ${t.TABLE_NAME}`);
      }
    });

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("✅ AUDIT TRAIL CRIADO COM SUCESSO!");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("📝 PRÓXIMOS PASSOS:\n");
    console.log("   1. Implementar auto-logging nas APIs");
    console.log("   2. Criar tela de auditoria no frontend");
    console.log("   3. Configurar alertas de mudanças críticas\n");

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ ERRO:", message);
    throw error;
  } finally {
    await pool.close();
  }
}

run().catch(console.error);

