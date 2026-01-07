/**
 * 🔧 CORRIGIR MULTI-TENANCY em financial_titles
 * 
 * Adiciona organization_id na tabela financial_titles para garantir
 * isolamento multi-tenant correto.
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
  console.log("🔧 CORRIGIR MULTI-TENANCY - financial_titles");
  console.log("═══════════════════════════════════════════════════════\n");

  const pool = await sql.connect(config);

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. Verificar se tabela existe
    // ═══════════════════════════════════════════════════════════════
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'financial_titles'
    `);

    if (tableCheck.recordset.length === 0) {
      console.log("❌ Tabela financial_titles não existe!");
      console.log("   ℹ️  Esta correção será aplicada quando a tabela for criada.\n");
      return;
    }

    console.log("✅ Tabela financial_titles encontrada");

    // ═══════════════════════════════════════════════════════════════
    // 2. Verificar se organization_id já existe
    // ═══════════════════════════════════════════════════════════════
    const columnCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'financial_titles' AND COLUMN_NAME = 'organization_id'
    `);

    if (columnCheck.recordset.length > 0) {
      console.log("⚠️  Coluna organization_id já existe!");
      console.log("   ℹ️  Nenhuma ação necessária.\n");
      return;
    }

    console.log("❌ Coluna organization_id NÃO encontrada\n");

    // ═══════════════════════════════════════════════════════════════
    // 3. Adicionar coluna organization_id
    // ═══════════════════════════════════════════════════════════════
    console.log("📝 Passo 1/4 - Adicionando coluna organization_id...");

    await pool.request().query(`
      ALTER TABLE financial_titles 
      ADD organization_id INT NOT NULL DEFAULT 1;
    `);

    console.log("   ✅ Coluna adicionada");

    // ═══════════════════════════════════════════════════════════════
    // 4. Atualizar registros existentes (se houver)
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📝 Passo 2/4 - Atualizando registros existentes...");

    const updateResult = await pool.request().query(`
      UPDATE ft
      SET ft.organization_id = COALESCE(b.organization_id, 1)
      FROM financial_titles ft
      LEFT JOIN branches b ON b.id = ft.branch_id
      WHERE ft.organization_id = 1;
    `);

    console.log(`   ✅ ${updateResult.rowsAffected[0]} registros atualizados`);

    // ═══════════════════════════════════════════════════════════════
    // 5. Criar FK constraint
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📝 Passo 3/4 - Criando Foreign Key...");

    await pool.request().query(`
      ALTER TABLE financial_titles
      ADD CONSTRAINT FK_financial_titles_organization
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
      ON DELETE CASCADE;
    `);

    console.log("   ✅ Foreign Key criada");

    // ═══════════════════════════════════════════════════════════════
    // 6. Criar índice para performance
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📝 Passo 4/4 - Criando índice...");

    await pool.request().query(`
      CREATE INDEX IX_financial_titles_organization 
      ON financial_titles(organization_id);
    `);

    console.log("   ✅ Índice criado\n");

    // ═══════════════════════════════════════════════════════════════
    // 7. Verificar resultado
    // ═══════════════════════════════════════════════════════════════
    console.log("📊 Verificando estrutura final...\n");

    const finalCheck = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'financial_titles' AND COLUMN_NAME = 'organization_id'
    `);

    if (finalCheck.recordset.length > 0) {
      const col = finalCheck.recordset[0];
      console.log("✅ SUCESSO! Coluna configurada:\n");
      console.log(`   Nome:     ${col.COLUMN_NAME}`);
      console.log(`   Tipo:     ${col.DATA_TYPE}`);
      console.log(`   Nullable: ${col.IS_NULLABLE}`);
      console.log(`   Default:  ${col.COLUMN_DEFAULT || 'N/A'}`);
    }

    const fkCheck = await pool.request().query(`
      SELECT 
        CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_NAME = 'financial_titles' 
        AND CONSTRAINT_NAME = 'FK_financial_titles_organization'
    `);

    if (fkCheck.recordset.length > 0) {
      console.log(`\n   ✅ Foreign Key: ${fkCheck.recordset[0].CONSTRAINT_NAME}`);
    }

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("✅ MULTI-TENANCY CORRIGIDO COM SUCESSO!");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("📝 PRÓXIMOS PASSOS:\n");
    console.log("   1. Atualizar APIs para usar organizationId nos filtros");
    console.log("   2. Testar isolamento multi-tenant");
    console.log("   3. Verificar outras tabelas sem organization_id\n");

  } catch (error: unknown) {
    console.error("\n❌ ERRO:", error.message);
    console.error("\n⚠️  Se a tabela não existe ainda, isto é normal.");
    console.error("   A correção será aplicada quando a tabela for criada.\n");
  } finally {
    await pool.close();
  }
}

run().catch(console.error);

