/**
 * AUDITORIA COMPLETA: PCC, PCG, CC, NCM, Categorias Financeiras
 * 
 * Verifica o estado real do banco de dados e compara com o planejado
 */

import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

// Interfaces para tipagem das rows do banco
interface CountRow {
  total: number;
  quantidade?: number;
  t?: number;
  table_exists?: number;
}

interface TypeGroupRow {
  type?: string;
  quantidade: number;
}

interface CategoryGroupRow {
  category?: string;
  quantidade: number;
}

interface PccSampleRow {
  code?: string;
  name?: string;
  type?: string;
  category?: string;
  status?: string;
}

interface PcgSampleRow {
  code?: string;
  name?: string;
  type?: string;
  category?: string;
  allocation_rule?: string;
}

interface ClassGroupRow {
  class?: string;
  quantidade: number;
}

interface CcSampleRow {
  code?: string;
  name?: string;
  class?: string;
  service_type?: string;
  status?: string;
}

interface PcgNcmSampleRow {
  ncm_code?: string;
  ncm_description?: string;
  flag_pis_cofins_monofasico?: number;
  flag_icms_st?: number;
}

interface MovementTypeGroupRow {
  tipo_movimento?: string;
  quantidade: number;
}

interface DfcGroupRow {
  grupo_dfc?: string;
  quantidade: number;
}

interface CfSampleRow {
  code?: string;
  name?: string;
  tipo_movimento?: string;
  grupo_dfc?: string;
}

interface DuplicateRow {
  code?: string;
  quantidade: number;
}

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
  console.log("║         🔍 AUDITORIA MASTER DATA - AURA CORE TMS                  ║");
  console.log("║                                                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const pool = await sql.connect(config);

  try {
    // ========================================
    // 1. PCC - PLANO DE CONTAS CONTÁBIL
    // ========================================
    console.log("📊 1. PCC - PLANO DE CONTAS CONTÁBIL (chart_of_accounts)");
    console.log("─".repeat(70));

    const pccTotal = await pool.request().query(`
      SELECT COUNT(*) as total FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    const pccByType = await pool.request().query(`
      SELECT 
        type,
        COUNT(*) as quantidade
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
      GROUP BY type
      ORDER BY type
    `);

    const pccByCategory = await pool.request().query(`
      SELECT 
        category,
        COUNT(*) as quantidade
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
      GROUP BY category
      ORDER BY quantidade DESC
    `);

    const pccSample = await pool.request().query(`
      SELECT TOP 10 code, name, type, category, status
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
      ORDER BY code
    `);

    console.log(`✅ Total de Contas PCC: ${pccTotal.recordset[0].total}`);
    console.log("\nPor Tipo:");
    pccByType.recordset.forEach((row: TypeGroupRow) => {
      console.log(`   ${row.type?.padEnd(25)} → ${row.quantidade} contas`);
    });

    console.log("\nPor Categoria:");
    pccByCategory.recordset.forEach((row: CategoryGroupRow) => {
      console.log(`   ${(row.category || 'NULL').padEnd(25)} → ${row.quantidade} contas`);
    });

    console.log("\nAmostra (10 primeiras):");
    pccSample.recordset.forEach((row: PccSampleRow) => {
      console.log(`   ${row.code?.padEnd(20)} ${row.name?.substring(0, 40).padEnd(42)} [${row.type}]`);
    });

    // ========================================
    // 2. PCG - PLANO DE CONTAS GERENCIAL
    // ========================================
    console.log("\n");
    console.log("📊 2. PCG - PLANO DE CONTAS GERENCIAL (management_chart_of_accounts)");
    console.log("─".repeat(70));

    // Verifica se a tabela existe
    const pcgTableExists = await pool.request().query(`
      SELECT COUNT(*) as table_exists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'management_chart_of_accounts'
    `);

    if (pcgTableExists.recordset[0].table_exists === 0) {
      console.log("❌ TABELA NÃO EXISTE!");
    } else {
      const pcgTotal = await pool.request().query(`
        SELECT COUNT(*) as total FROM management_chart_of_accounts 
        WHERE organization_id = 1 AND deleted_at IS NULL
      `);

      const pcgByType = await pool.request().query(`
        SELECT 
          type,
          COUNT(*) as quantidade
        FROM management_chart_of_accounts 
        WHERE organization_id = 1 AND deleted_at IS NULL
        GROUP BY type
        ORDER BY type
      `);

      const pcgSample = await pool.request().query(`
        SELECT TOP 20 code, name, type, category, allocation_rule
        FROM management_chart_of_accounts 
        WHERE organization_id = 1 AND deleted_at IS NULL
        ORDER BY code
      `);

      console.log(`✅ Total de Contas PCG: ${pcgTotal.recordset[0].total}`);
      
      if (pcgTotal.recordset[0].total > 0) {
        console.log("\nPor Tipo:");
        pcgByType.recordset.forEach((row: TypeGroupRow) => {
          console.log(`   ${row.type?.padEnd(25)} → ${row.quantidade} contas`);
        });

        console.log("\nAmostra (até 20):");
        pcgSample.recordset.forEach((row: PcgSampleRow) => {
          console.log(`   ${row.code?.padEnd(15)} ${row.name?.substring(0, 35).padEnd(37)} [${row.type}]`);
        });
      } else {
        console.log("⚠️  TABELA EXISTE MAS ESTÁ VAZIA!");
      }
    }

    // ========================================
    // 3. CC - CENTROS DE CUSTO
    // ========================================
    console.log("\n");
    console.log("📊 3. CC - CENTROS DE CUSTO (cost_centers)");
    console.log("─".repeat(70));

    const ccTotal = await pool.request().query(`
      SELECT COUNT(*) as total FROM cost_centers 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    const ccByClass = await pool.request().query(`
      SELECT 
        class,
        COUNT(*) as quantidade
      FROM cost_centers 
      WHERE organization_id = 1 AND deleted_at IS NULL
      GROUP BY class
      ORDER BY class
    `);

    const ccSample = await pool.request().query(`
      SELECT TOP 20 code, name, class, service_type, status
      FROM cost_centers 
      WHERE organization_id = 1 AND deleted_at IS NULL
      ORDER BY code
    `);

    console.log(`✅ Total de Centros de Custo: ${ccTotal.recordset[0].total}`);
    
    if (ccTotal.recordset[0].total > 0) {
      console.log("\nPor Classe:");
      ccByClass.recordset.forEach((row: ClassGroupRow) => {
        console.log(`   ${(row.class || 'NULL').padEnd(25)} → ${row.quantidade} centros`);
      });

      console.log("\nAmostra (até 20):");
      ccSample.recordset.forEach((row: CcSampleRow) => {
        console.log(`   ${row.code?.padEnd(12)} ${row.name?.substring(0, 40).padEnd(42)} [${row.class || 'NULL'}]`);
      });
    } else {
      console.log("⚠️  TABELA VAZIA!");
    }

    // ========================================
    // 4. PCG-NCM RULES
    // ========================================
    console.log("\n");
    console.log("📊 4. PCG-NCM RULES (pcg_ncm_rules)");
    console.log("─".repeat(70));

    const pcgNcmTableExists = await pool.request().query(`
      SELECT COUNT(*) as table_exists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'pcg_ncm_rules'
    `);

    if (pcgNcmTableExists.recordset[0].table_exists === 0) {
      console.log("❌ TABELA NÃO EXISTE!");
    } else {
      const pcgNcmTotal = await pool.request().query(`
        SELECT COUNT(*) as total FROM pcg_ncm_rules 
        WHERE organization_id = 1 AND deleted_at IS NULL
      `);

      const pcgNcmMonofasico = await pool.request().query(`
        SELECT COUNT(*) as total FROM pcg_ncm_rules 
        WHERE organization_id = 1 AND deleted_at IS NULL 
        AND flag_pis_cofins_monofasico = 1
      `);

      const pcgNcmSample = await pool.request().query(`
        SELECT TOP 10 ncm_code, ncm_description, flag_pis_cofins_monofasico, flag_icms_st
        FROM pcg_ncm_rules 
        WHERE organization_id = 1 AND deleted_at IS NULL
        ORDER BY ncm_code
      `);

      console.log(`✅ Total de Regras PCG-NCM: ${pcgNcmTotal.recordset[0].total}`);
      console.log(`   Monofásicas: ${pcgNcmMonofasico.recordset[0].total}`);

      if (pcgNcmTotal.recordset[0].total > 0) {
        console.log("\nAmostra (10 primeiras):");
        pcgNcmSample.recordset.forEach((row: PcgNcmSampleRow) => {
          const mono = row.flag_pis_cofins_monofasico ? '✅ MONO' : '❌';
          const st = row.flag_icms_st ? '✅ ST' : '❌';
          console.log(`   ${row.ncm_code?.padEnd(12)} ${row.ncm_description?.substring(0, 30).padEnd(32)} ${mono} ${st}`);
        });
      } else {
        console.log("⚠️  TABELA EXISTE MAS ESTÁ VAZIA!");
      }
    }

    // ========================================
    // 5. CATEGORIAS FINANCEIRAS
    // ========================================
    console.log("\n");
    console.log("📊 5. CATEGORIAS FINANCEIRAS (financial_categories)");
    console.log("─".repeat(70));

    const cfTotal = await pool.request().query(`
      SELECT COUNT(*) as total FROM financial_categories 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    const cfByTipo = await pool.request().query(`
      SELECT 
        tipo_movimento,
        COUNT(*) as quantidade
      FROM financial_categories 
      WHERE organization_id = 1 AND deleted_at IS NULL
      GROUP BY tipo_movimento
      ORDER BY tipo_movimento
    `);

    const cfByGrupo = await pool.request().query(`
      SELECT 
        grupo_dfc,
        COUNT(*) as quantidade
      FROM financial_categories 
      WHERE organization_id = 1 AND deleted_at IS NULL
      GROUP BY grupo_dfc
      ORDER BY quantidade DESC
    `);

    const cfSample = await pool.request().query(`
      SELECT TOP 10 code, name, tipo_movimento, grupo_dfc
      FROM financial_categories 
      WHERE organization_id = 1 AND deleted_at IS NULL
      ORDER BY code
    `);

    console.log(`✅ Total de Categorias Financeiras: ${cfTotal.recordset[0].total}`);
    
    if (cfTotal.recordset[0].total > 0) {
      console.log("\nPor Tipo de Movimento:");
      cfByTipo.recordset.forEach((row: MovementTypeGroupRow) => {
        console.log(`   ${(row.tipo_movimento || 'NULL').padEnd(25)} → ${row.quantidade} categorias`);
      });

      console.log("\nPor Grupo DFC:");
      cfByGrupo.recordset.forEach((row: DfcGroupRow) => {
        console.log(`   ${(row.grupo_dfc || 'NULL').padEnd(25)} → ${row.quantidade} categorias`);
      });

      console.log("\nAmostra (10 primeiras):");
      cfSample.recordset.forEach((row: CfSampleRow) => {
        console.log(`   ${row.code?.padEnd(10)} ${row.name?.substring(0, 35).padEnd(37)} [${row.tipo_movimento}/${row.grupo_dfc}]`);
      });
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════════╗");
    console.log("║                      📊 RESUMO DA AUDITORIA                        ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝");
    console.log("");
    console.log(`  PCC (Plano Contábil)          → ${pccTotal.recordset[0].total} contas`);
    console.log(`  PCG (Plano Gerencial)         → ${pcgTableExists.recordset[0].table_exists === 0 ? 'TABELA NÃO EXISTE' : `${(await pool.request().query(`SELECT COUNT(*) as t FROM management_chart_of_accounts WHERE organization_id = 1 AND deleted_at IS NULL`)).recordset[0].t} contas`}`);
    console.log(`  CC (Centros de Custo)         → ${ccTotal.recordset[0].total} centros`);
    console.log(`  PCG-NCM Rules                 → ${pcgNcmTableExists.recordset[0].table_exists === 0 ? 'TABELA NÃO EXISTE' : `${(await pool.request().query(`SELECT COUNT(*) as t FROM pcg_ncm_rules WHERE organization_id = 1 AND deleted_at IS NULL`)).recordset[0].t} regras`}`);
    console.log(`  Categorias Financeiras        → ${cfTotal.recordset[0].total} categorias`);
    console.log("");

    // ========================================
    // VERIFICAÇÃO DE TABELAS DUPLICADAS
    // ========================================
    console.log("\n");
    console.log("🔍 VERIFICAÇÃO DE TABELAS DUPLICADAS/INCONSISTÊNCIAS");
    console.log("─".repeat(70));

    // Verifica se há contas PCC com códigos duplicados
    const pccDuplicates = await pool.request().query(`
      SELECT code, COUNT(*) as quantidade
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
      GROUP BY code
      HAVING COUNT(*) > 1
    `);

    if (pccDuplicates.recordset.length > 0) {
      console.log("⚠️  CÓDIGOS PCC DUPLICADOS:");
      pccDuplicates.recordset.forEach((row: DuplicateRow) => {
        console.log(`   ${row.code} → ${row.quantidade}x`);
      });
    } else {
      console.log("✅ Sem códigos PCC duplicados");
    }

    // Verifica se há centros de custo com códigos duplicados
    const ccDuplicates = await pool.request().query(`
      SELECT code, COUNT(*) as quantidade
      FROM cost_centers 
      WHERE organization_id = 1 AND deleted_at IS NULL
      GROUP BY code
      HAVING COUNT(*) > 1
    `);

    if (ccDuplicates.recordset.length > 0) {
      console.log("⚠️  CÓDIGOS CC DUPLICADOS:");
      ccDuplicates.recordset.forEach((row: DuplicateRow) => {
        console.log(`   ${row.code} → ${row.quantidade}x`);
      });
    } else {
      console.log("✅ Sem códigos CC duplicados");
    }

    // Verifica se há registros "deletados" (soft delete)
    const pccDeleted = await pool.request().query(`
      SELECT COUNT(*) as total FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NOT NULL
    `);

    const ccDeleted = await pool.request().query(`
      SELECT COUNT(*) as total FROM cost_centers 
      WHERE organization_id = 1 AND deleted_at IS NOT NULL
    `);

    if (pccDeleted.recordset[0].total > 0) {
      console.log(`⚠️  Registros PCC deletados (soft delete): ${pccDeleted.recordset[0].total}`);
    }

    if (ccDeleted.recordset[0].total > 0) {
      console.log(`⚠️  Registros CC deletados (soft delete): ${ccDeleted.recordset[0].total}`);
    }

    console.log("\n");

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ ERRO:", message);
    throw error;
  } finally{
    await pool.close();
  }
}

run().catch(console.error);




