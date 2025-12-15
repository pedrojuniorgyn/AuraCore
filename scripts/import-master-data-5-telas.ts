/**
 * Importa SOMENTE Master Data das 5 telas:
 * - Plano de Contas Gerencial (PCG) -> management_chart_of_accounts
 * - Centro de Custo (CC)            -> cost_centers
 * - Categorias Financeiras (CF)     -> financial_categories
 * - Categorias NCM                 -> ncm_financial_categories (mapeia NCM -> CF/PCC)
 * - Centro de Custo 3D             -> financial_cost_centers
 *
 * ✅ Idempotente: pode rodar várias vezes sem duplicar.
 * ✅ Seguro: não mexe em dados transacionais.
 *
 * Execute no container `web` do Coolify:
 *   npx -y tsx scripts/import-master-data-5-telas.ts
 */

import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME as string,
  options: {
    encrypt: (process.env.DB_ENCRYPT ?? "false") === "true",
    trustServerCertificate: (process.env.DB_TRUST_CERT ?? "true") === "true",
    enableArithAbort: true,
  },
  port: Number(process.env.DB_PORT ?? "1433"),
};

async function ensureTable(pool: sql.ConnectionPool, name: string, ddl: string) {
  const exists = await pool.request().query(`
    SELECT COUNT(*) as c
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = '${name}'
  `);
  if (exists.recordset[0]?.c > 0) return;
  await pool.request().query(ddl);
}

async function upsertFinancialCategory(
  pool: sql.ConnectionPool,
  orgId: number,
  name: string,
  type: "INCOME" | "EXPENSE",
  createdBy: string
) {
  await pool.request()
    .input("orgId", sql.Int, orgId)
    .input("name", sql.NVarChar, name)
    .input("type", sql.NVarChar, type)
    .input("createdBy", sql.NVarChar, createdBy)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM financial_categories
        WHERE organization_id = @orgId AND name = @name AND deleted_at IS NULL
      )
      BEGIN
        INSERT INTO financial_categories (
          organization_id, name, type, status, created_by, created_at, updated_at, version
        )
        VALUES (
          @orgId, @name, @type, 'ACTIVE', @createdBy, GETDATE(), GETDATE(), 1
        )
      END
    `);
}

async function getFinancialCategoryId(
  pool: sql.ConnectionPool,
  orgId: number,
  name: string
): Promise<number | null> {
  const r = await pool.request()
    .input("orgId", sql.Int, orgId)
    .input("name", sql.NVarChar, name)
    .query(`
      SELECT TOP 1 id
      FROM financial_categories
      WHERE organization_id = @orgId AND name = @name AND deleted_at IS NULL
      ORDER BY id ASC
    `);
  return (r.recordset[0]?.id as number) ?? null;
}

async function getChartAccountIdByCode(
  pool: sql.ConnectionPool,
  orgId: number,
  code: string
): Promise<number | null> {
  const r = await pool.request()
    .input("orgId", sql.Int, orgId)
    .input("code", sql.NVarChar, code)
    .query(`
      SELECT TOP 1 id
      FROM chart_of_accounts
      WHERE organization_id = @orgId
        AND code = @code
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);
  return (r.recordset[0]?.id as number) ?? null;
}

async function upsertNcmCategory(
  pool: sql.ConnectionPool,
  orgId: number,
  ncm: string,
  description: string,
  financialCategoryId: number | null,
  chartAccountId: number | null,
  createdBy: string
) {
  await pool.request()
    .input("orgId", sql.Int, orgId)
    .input("ncm", sql.NVarChar, ncm)
    .input("desc", sql.NVarChar, description)
    .input("fcId", sql.Int, financialCategoryId)
    .input("coaId", sql.Int, chartAccountId)
    .input("createdBy", sql.NVarChar, createdBy)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM ncm_financial_categories
        WHERE organization_id = @orgId AND ncm_code = @ncm AND deleted_at IS NULL
      )
      BEGIN
        INSERT INTO ncm_financial_categories (
          organization_id, ncm_code, financial_category_id, chart_account_id,
          description, is_active, created_by, created_at, updated_at, version
        )
        VALUES (
          @orgId, @ncm, @fcId, @coaId,
          @desc, 1, @createdBy, GETDATE(), GETDATE(), 1
        )
      END
    `);
}

async function upsertCostCenter(
  pool: sql.ConnectionPool,
  orgId: number,
  code: string,
  name: string,
  serviceType: string,
  clazz: "REVENUE" | "EXPENSE",
  createdBy: string
) {
  await pool.request()
    .input("orgId", sql.Int, orgId)
    .input("code", sql.NVarChar, code)
    .input("name", sql.NVarChar, name)
    .input("serviceType", sql.NVarChar, serviceType)
    .input("class", sql.NVarChar, clazz)
    .input("createdBy", sql.NVarChar, createdBy)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM cost_centers
        WHERE organization_id = @orgId AND code = @code AND deleted_at IS NULL
      )
      BEGIN
        INSERT INTO cost_centers (
          organization_id, code, name, type, level, is_analytical,
          service_type, class, status,
          created_by, updated_by, created_at, updated_at, version
        )
        VALUES (
          @orgId, @code, @name, 'ANALYTIC', 1, 'true',
          @serviceType, @class, 'ACTIVE',
          @createdBy, @createdBy, GETDATE(), GETDATE(), 1
        )
      END
    `);
}

async function upsertCostCenter3D(
  pool: sql.ConnectionPool,
  orgId: number,
  code: string,
  name: string,
  branchId: number,
  serviceType: string | null,
  createdBy: string
) {
  await pool.request()
    .input("orgId", sql.Int, orgId)
    .input("code", sql.NVarChar, code)
    .input("name", sql.NVarChar, name)
    .input("branchId", sql.Int, branchId)
    .input("serviceType", sql.NVarChar, serviceType)
    .input("createdBy", sql.NVarChar, createdBy)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM financial_cost_centers
        WHERE organization_id = @orgId AND code = @code AND deleted_at IS NULL
      )
      BEGIN
        INSERT INTO financial_cost_centers (
          organization_id, code, name, description, type, branch_id, service_type,
          is_analytical, level, status, class,
          created_by, updated_by, created_at, updated_at, version
        )
        VALUES (
          @orgId, @code, @name, @name, 'ANALYTIC', @branchId, @serviceType,
          1, 1, 'ACTIVE', 'BOTH',
          @createdBy, @createdBy, GETDATE(), GETDATE(), 1
        )
      END
    `);
}

async function upsertPcg(
  pool: sql.ConnectionPool,
  orgId: number,
  code: string,
  name: string,
  type: string,
  createdBy: string
) {
  await pool.request()
    .input("orgId", sql.Int, orgId)
    .input("code", sql.NVarChar, code)
    .input("name", sql.NVarChar, name)
    .input("type", sql.NVarChar, type)
    .input("createdBy", sql.NVarChar, createdBy)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM management_chart_of_accounts
        WHERE organization_id = @orgId AND code = @code AND deleted_at IS NULL
      )
      BEGIN
        INSERT INTO management_chart_of_accounts (
          organization_id, code, name, type, is_analytical, status,
          created_by, updated_by, created_at, updated_at, version
        )
        VALUES (
          @orgId, @code, @name, @type, 1, 'ACTIVE',
          @createdBy, @createdBy, GETDATE(), GETDATE(), 1
        )
      END
    `);
}

async function main() {
  console.log("\n📦 IMPORT MASTER DATA (5 TELAS)");
  console.log("  - PCG, CC, CF, NCM Categories, CC 3D\n");

  const pool = await sql.connect(config);

  try {
    const orgRow = await pool.request().query(`
      SELECT TOP 1 id
      FROM organizations
      ORDER BY id ASC
    `);
    const orgId = (orgRow.recordset[0]?.id as number) ?? 1;
    const createdBy = process.env.ADMIN_EMAIL || "SYSTEM";

    console.log(`🏢 Banco: ${process.env.DB_NAME} | Org: ${orgId}`);

    // 1) Garantir tabelas que podem estar faltando no banco de teste
    await ensureTable(
      pool,
      "management_chart_of_accounts",
      `
      CREATE TABLE management_chart_of_accounts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        type NVARCHAR(20) NOT NULL,
        category NVARCHAR(100) NULL,
        parent_id INT NULL,
        level INT NULL,
        is_analytical INT NULL,
        legal_account_id INT NULL,
        allocation_rule NVARCHAR(50) NULL,
        allocation_base NVARCHAR(50) NULL,
        status NVARCHAR(20) DEFAULT 'ACTIVE',
        created_by NVARCHAR(255) NOT NULL,
        updated_by NVARCHAR(255) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        version INT DEFAULT 1
      );
      CREATE UNIQUE INDEX management_chart_of_accounts_code_org_idx
        ON management_chart_of_accounts(organization_id, code)
        WHERE deleted_at IS NULL;
    `
    );

    await ensureTable(
      pool,
      "cost_centers",
      `
      CREATE TABLE cost_centers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        type NVARCHAR(20) NOT NULL, -- ANALYTIC/SYNTHETIC
        parent_id INT NULL,
        level INT NULL,
        is_analytical NVARCHAR(10) NULL,
        service_type NVARCHAR(50) NULL,
        linked_vehicle_id INT NULL,
        linked_partner_id INT NULL,
        linked_branch_id INT NULL,
        class NVARCHAR(20) DEFAULT 'BOTH',
        status NVARCHAR(20) DEFAULT 'ACTIVE',
        created_by NVARCHAR(255) NOT NULL,
        updated_by NVARCHAR(255) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        version INT DEFAULT 1
      );
      CREATE UNIQUE INDEX cost_centers_code_org_idx
        ON cost_centers(organization_id, code)
        WHERE deleted_at IS NULL;
    `
    );

    await ensureTable(
      pool,
      "financial_cost_centers",
      `
      CREATE TABLE financial_cost_centers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        type NVARCHAR(20) NOT NULL, -- ANALYTIC/SYNTHETIC
        branch_id INT NULL,
        service_type NVARCHAR(20) NULL,
        linked_object_type NVARCHAR(30) NULL,
        linked_object_id BIGINT NULL,
        asset_type NVARCHAR(20) NULL,
        is_analytical BIT DEFAULT 1,
        level INT DEFAULT 1,
        class NVARCHAR(20) DEFAULT 'BOTH',
        status NVARCHAR(20) DEFAULT 'ACTIVE',
        created_by NVARCHAR(255) NOT NULL,
        updated_by NVARCHAR(255) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        version INT DEFAULT 1
      );
      CREATE UNIQUE INDEX financial_cost_centers_code_org_idx
        ON financial_cost_centers(organization_id, code)
        WHERE deleted_at IS NULL;
    `
    );

    await ensureTable(
      pool,
      "ncm_financial_categories",
      `
      CREATE TABLE ncm_financial_categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        ncm_code NVARCHAR(10) NOT NULL,
        financial_category_id INT NULL,
        chart_account_id INT NULL,
        description NVARCHAR(255) NULL,
        is_active BIT DEFAULT 1,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        version INT DEFAULT 1
      );
      CREATE UNIQUE INDEX ncm_financial_categories_org_ncm_idx
        ON ncm_financial_categories(organization_id, ncm_code)
        WHERE deleted_at IS NULL;
    `
    );

    console.log("✅ Tabelas garantidas.\n");

    // 2) PCG (Plano de Contas Gerencial)
    console.log("📌 Importando PCG...");
    const pcgSeed = [
      { code: "G-4.1.1.01.001", name: "Custo Gerencial - Diesel (KM)", type: "COST" },
      { code: "G-4.1.1.02.001", name: "Custo Gerencial - Pneus (KM)", type: "COST" },
      { code: "G-4.1.2.01.001", name: "Custo Gerencial - Frete Subcontratado", type: "COST" },
      { code: "G-4.2.1.01.001", name: "Despesa Gerencial - Salários Rateados", type: "EXPENSE" },
      { code: "G-4.2.4.01.001", name: "Despesa Gerencial - Depreciação Alocada", type: "EXPENSE" },
    ];
    for (const a of pcgSeed) {
      await upsertPcg(pool, orgId, a.code, a.name, a.type, createdBy);
    }
    console.log(`✅ PCG ok (${pcgSeed.length}).\n`);

    // 3) Categorias Financeiras (mínimas para NCM)
    console.log("📌 Importando Categorias Financeiras...");
    const categories = [
      { name: "Combustível", type: "EXPENSE" as const },
      { name: "Manutenção", type: "EXPENSE" as const },
      { name: "Material de Limpeza", type: "EXPENSE" as const },
      { name: "Material", type: "EXPENSE" as const },
      { name: "Ferramentas", type: "EXPENSE" as const },
      { name: "Segurança", type: "EXPENSE" as const },
      { name: "Escritório", type: "EXPENSE" as const },
      { name: "Informática", type: "EXPENSE" as const },
      { name: "Comunicação", type: "EXPENSE" as const },
      { name: "Alimentação", type: "EXPENSE" as const },
      { name: "Serviços", type: "EXPENSE" as const },
      { name: "Outros", type: "EXPENSE" as const },
    ];
    for (const c of categories) {
      await upsertFinancialCategory(pool, orgId, c.name, c.type, createdBy);
    }
    console.log(`✅ Categorias Financeiras ok (${categories.length}).\n`);

    // 4) Centros de Custo (CC)
    console.log("📌 Importando Centros de Custo...");
    const ccSeed = [
      { code: "CC-901", name: "Operação Frota Rodoviária", service: "TRANSPORTE", class: "EXPENSE" as const },
      { code: "CC-902", name: "Manutenção Oficina Interna", service: "MANUTENCAO", class: "EXPENSE" as const },
      { code: "CC-903", name: "Comercial Vendas", service: "COMERCIAL", class: "EXPENSE" as const },
      { code: "CC-904", name: "Administrativo / RH", service: "ADMINISTRATIVO", class: "EXPENSE" as const },
      { code: "CC-905", name: "Tecnologia / TI", service: "TI", class: "EXPENSE" as const },
      { code: "CC-906", name: "Armazém / WMS", service: "ARMAZENAGEM", class: "EXPENSE" as const },
      { code: "CC-907", name: "Fiscal / Contábil", service: "FISCAL", class: "EXPENSE" as const },
      { code: "CC-908", name: "Financeiro / Tesouraria", service: "FINANCEIRO", class: "EXPENSE" as const },
      { code: "CC-998", name: "Receita Faturamento WMS", service: "ARMAZENAGEM", class: "REVENUE" as const },
      { code: "CC-999", name: "Receita Faturamento TMS", service: "OPERACAO", class: "REVENUE" as const },
    ];
    for (const cc of ccSeed) {
      await upsertCostCenter(pool, orgId, cc.code, cc.name, cc.service, cc.class, createdBy);
    }
    console.log(`✅ CC ok (${ccSeed.length}).\n`);

    // 5) Centro de Custo 3D (financial_cost_centers)
    console.log("📌 Importando CC 3D...");
    // branch default
    const branchRow = await pool.request().input("orgId", sql.Int, orgId).query(`
      SELECT TOP 1 id FROM branches
      WHERE organization_id = @orgId AND deleted_at IS NULL
      ORDER BY id ASC
    `);
    const branchId = (branchRow.recordset[0]?.id as number) ?? 1;
    const cc3dSeed = [
      { code: "3D-FTL", name: "CC 3D - FTL", serviceType: "FTL" },
      { code: "3D-LTL", name: "CC 3D - LTL", serviceType: "LTL" },
      { code: "3D-ARMAZ", name: "CC 3D - Armazenagem", serviceType: "ARMAZ" },
      { code: "3D-DISTR", name: "CC 3D - Distribuição", serviceType: "DISTR" },
      { code: "3D-ADM", name: "CC 3D - Administrativo", serviceType: "ADM" },
    ];
    for (const c of cc3dSeed) {
      await upsertCostCenter3D(pool, orgId, c.code, c.name, branchId, c.serviceType, createdBy);
    }
    console.log(`✅ CC 3D ok (${cc3dSeed.length}).\n`);

    // 6) Categorias NCM (mapeia NCM -> CF e, quando possível, PCC)
    console.log("📌 Importando Categorias NCM...");
    const fcComb = await getFinancialCategoryId(pool, orgId, "Combustível");
    const fcMan = await getFinancialCategoryId(pool, orgId, "Manutenção");
    const fcOut = await getFinancialCategoryId(pool, orgId, "Outros");

    // PCC (73) - códigos relevantes
    const accDiesel = await getChartAccountIdByCode(pool, orgId, "4.1.1.01.001"); // Combustível
    const accLub = await getChartAccountIdByCode(pool, orgId, "4.1.1.01.003"); // Óleos e lubrificantes
    const accPneu = await getChartAccountIdByCode(pool, orgId, "4.1.1.02.001"); // Pneus
    const accRecap = await getChartAccountIdByCode(pool, orgId, "4.1.1.02.002"); // Recapagem
    const accPecasMec = await getChartAccountIdByCode(pool, orgId, "4.1.1.03.001"); // Peças mecânicas
    const accPecasEle = await getChartAccountIdByCode(pool, orgId, "4.1.1.03.002"); // Peças elétricas/baterias

    const ncmSeed = [
      // combustíveis
      { ncm: "27101932", desc: "Diesel S10", fc: fcComb, coa: accDiesel },
      { ncm: "27101931", desc: "Diesel S500", fc: fcComb, coa: accDiesel },
      { ncm: "27101912", desc: "Gasolina", fc: fcComb, coa: accDiesel },
      { ncm: "27101929", desc: "Etanol", fc: fcComb, coa: accDiesel },
      // lubrificantes
      { ncm: "27101219", desc: "Óleo Lubrificante Mineral", fc: fcMan, coa: accLub },
      { ncm: "27101211", desc: "Óleo de Motor", fc: fcMan, coa: accLub },
      { ncm: "27101990", desc: "Graxa", fc: fcMan, coa: accLub },
      // pneus e câmaras
      { ncm: "40116100", desc: "Pneus para Caminhão", fc: fcMan, coa: accPneu },
      { ncm: "40116200", desc: "Pneus para Ônibus", fc: fcMan, coa: accPneu },
      { ncm: "40113000", desc: "Pneus de Borracha Maciça", fc: fcMan, coa: accPneu },
      { ncm: "40139000", desc: "Câmaras de Ar", fc: fcMan, coa: accRecap },
      // peças
      { ncm: "87089900", desc: "Peças de Veículos", fc: fcMan, coa: accPecasMec },
      { ncm: "84212300", desc: "Filtros de Óleo", fc: fcMan, coa: accPecasMec },
      { ncm: "84213100", desc: "Filtros de Ar", fc: fcMan, coa: accPecasMec },
      { ncm: "84099199", desc: "Motores Diesel - Peças", fc: fcMan, coa: accPecasMec },
      { ncm: "85123000", desc: "Buzinas", fc: fcMan, coa: accPecasEle },
      { ncm: "85364900", desc: "Relés", fc: fcMan, coa: accPecasEle },
      { ncm: "85369090", desc: "Conectores Elétricos", fc: fcMan, coa: accPecasEle },
      // outros (sem PCC específico)
      { ncm: "99999999", desc: "Outros Serviços", fc: fcOut, coa: null },
    ];
    for (const n of ncmSeed) {
      await upsertNcmCategory(pool, orgId, n.ncm, n.desc, n.fc ?? null, n.coa ?? null, createdBy);
    }
    console.log(`✅ NCM categories ok (${ncmSeed.length}).\n`);

    console.log("✅ Import concluído (5 telas).");
    console.log("🔎 Valide nas telas: PCG, CC, Categorias Financeiras, Categorias NCM, CC 3D.\n");
  } finally {
    await pool.close();
  }
}

main().catch((e) => {
  console.error("❌ Falha no import master data:", e);
  process.exit(1);
});

