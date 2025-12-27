import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/context";

export async function POST(request: NextRequest) {
  try {
    console.log("🌱 Iniciando seed de contas contábeis Enterprise");
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: "Apenas ADMIN pode executar seed enterprise" },
        { status: 403 }
      );
    }
    const orgId = ctx.organizationId;

    // Por padrão, NÃO semeamos Matriz Tributária (pedido do usuário).
    // Se quiser semear, envie { includeTaxMatrix: true } no body.
    let includeTaxMatrix = false;
    try {
      const body = await request.json().catch(() => ({}));
      includeTaxMatrix = body?.includeTaxMatrix === true;
    } catch {
      includeTaxMatrix = false;
    }

    function renderOrgSql(template: string, orgId: number): string {
      // Corrige hardcodes perigosos de multi-tenancy em templates SQL:
      // - organization_id = 1  -> organization_id = __ORG_ID__
      // - SELECT 1,            -> SELECT __ORG_ID__,
      //
      // Importante: não mexemos em "SELECT 1 FROM" em subqueries (sentinel de EXISTS).
      let sql = template;
      sql = sql.replace(/\borganization_id\s*=\s*1\b/gi, "organization_id = __ORG_ID__");
      sql = sql.replace(/\bSELECT\s+1\s*,/gi, "SELECT __ORG_ID__,");

      sql = sql.replaceAll("__ORG_ID__", String(orgId));

      // 🔐 Hard-fail se sobrar hardcode (evita vazamento entre tenants)
      // OBS: se o tenant atual for orgId=1, esses padrões são válidos após renderização.
      // Só bloqueamos quando orgId != 1, pois aí indicaria que sobrou hardcode.
      if (orgId !== 1) {
        if (/\borganization_id\s*=\s*1\b/i.test(sql)) {
          throw new Error("Seed SQL inseguro: encontrou 'organization_id = 1' após renderização.");
        }
        if (/\bSELECT\s+1\s*,/i.test(sql)) {
          throw new Error("Seed SQL inseguro: encontrou 'SELECT 1,' após renderização.");
        }
      }
      return sql;
    }
    
    // ⚠️ IMPORTANTE:
    // No AuraCore (MSSQL), as tabelas do módulo financeiro são:
    // - dbo.chart_of_accounts (PCC)
    // - dbo.cost_centers
    // - dbo.tax_matrix (usada pelo tax-calculator)
    //
    // A tabela dbo.financial_chart_accounts NÃO existe no schema atual, por isso o erro 500 no Coolify.
    const accounts = `
      IF OBJECT_ID(N'dbo.chart_of_accounts', 'U') IS NULL
      BEGIN
        THROW 50001, 'Tabela ausente: dbo.chart_of_accounts. Rode as migrations do banco principal antes do seed.', 1;
      END;

      -- PCC (chart_of_accounts)
      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '4.3', 'CUSTOS DE APOIO OPERACIONAL', 'Custos dos departamentos de suporte', 'EXPENSE', 'ADMINISTRATIVE', NULL, 0, 'false', 'false', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '4.3' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '4.3.1', 'OFICINA MECÂNICA INTERNA', 'Custos para manter oficina', 'EXPENSE', 'OPERATIONAL_OWN_FLEET',
             (SELECT id FROM dbo.chart_of_accounts WHERE code = '4.3' AND organization_id = __ORG_ID__ AND deleted_at IS NULL),
             1, 'false', 'false', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '4.3.1' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '4.3.1.01.001', 'Ferramental e Utensílios', 'Ferramentas oficina', 'EXPENSE', 'OPERATIONAL_OWN_FLEET',
             (SELECT id FROM dbo.chart_of_accounts WHERE code = '4.3.1' AND organization_id = __ORG_ID__ AND deleted_at IS NULL),
             2, 'true', 'true', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '4.3.1.01.001' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '4.3.1.01.002', 'Gases Industriais', 'Oxigênio/Acetileno', 'EXPENSE', 'OPERATIONAL_OWN_FLEET',
             (SELECT id FROM dbo.chart_of_accounts WHERE code = '4.3.1' AND organization_id = __ORG_ID__ AND deleted_at IS NULL),
             2, 'true', 'true', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '4.3.1.01.002' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '3.1.2', 'RECEITAS LOGÍSTICAS', 'Armazenagem e WMS', 'REVENUE', 'SALES', NULL, 0, 'false', 'false', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '3.1.2' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '3.1.2.01.001', 'Receita Armazenagem Pallet', 'Cobrança por posição', 'REVENUE', 'SALES',
             (SELECT id FROM dbo.chart_of_accounts WHERE code = '3.1.2' AND organization_id = __ORG_ID__ AND deleted_at IS NULL),
             1, 'true', 'false', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '3.1.2.01.001' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '3.1.2.02.001', 'Receita Inbound', 'Recebimento mercadorias', 'REVENUE', 'SALES',
             (SELECT id FROM dbo.chart_of_accounts WHERE code = '3.1.2' AND organization_id = __ORG_ID__ AND deleted_at IS NULL),
             1, 'true', 'false', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '3.1.2.02.001' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.chart_of_accounts (organization_id, code, name, description, type, category, parent_id, level, is_analytical, accepts_cost_center, requires_cost_center, status, created_by, updated_by)
      SELECT __ORG_ID__, '3.1.2.02.002', 'Receita Outbound', 'Expedição mercadorias', 'REVENUE', 'SALES',
             (SELECT id FROM dbo.chart_of_accounts WHERE code = '3.1.2' AND organization_id = __ORG_ID__ AND deleted_at IS NULL),
             1, 'true', 'false', 'false', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.chart_of_accounts WHERE code = '3.1.2.02.002' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);
    `;

    await pool.query(
      renderOrgSql(accounts, orgId).replaceAll("__CREATED_BY__", String(ctx.userId))
    );

    // Seed Centros de Custo Departamentais
    const costCenters = `
      IF OBJECT_ID(N'dbo.cost_centers', 'U') IS NULL
      BEGIN
        THROW 50002, 'Tabela ausente: dbo.cost_centers. Rode as migrations do banco principal antes do seed.', 1;
      END;

      INSERT INTO dbo.cost_centers (organization_id, code, name, description, type, parent_id, level, is_analytical, class, status, created_by, updated_by)
      SELECT __ORG_ID__, 'CC-901', 'OFICINA MECÂNICA', 'Manutenção frota', 'ANALYTIC', NULL, 0, 'true', 'EXPENSE', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.cost_centers WHERE code = 'CC-901' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.cost_centers (organization_id, code, name, description, type, parent_id, level, is_analytical, class, status, created_by, updated_by)
      SELECT __ORG_ID__, 'CC-902', 'POSTO INTERNO', 'Abastecimento', 'ANALYTIC', NULL, 0, 'true', 'EXPENSE', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.cost_centers WHERE code = 'CC-902' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.cost_centers (organization_id, code, name, description, type, parent_id, level, is_analytical, class, status, created_by, updated_by)
      SELECT __ORG_ID__, 'CC-903', 'LAVA JATO', 'Conservação', 'ANALYTIC', NULL, 0, 'true', 'EXPENSE', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.cost_centers WHERE code = 'CC-903' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.cost_centers (organization_id, code, name, description, type, parent_id, level, is_analytical, class, status, created_by, updated_by)
      SELECT __ORG_ID__, 'CC-920', 'RH / D.P.', 'Recursos Humanos', 'ANALYTIC', NULL, 0, 'true', 'EXPENSE', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.cost_centers WHERE code = 'CC-920' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.cost_centers (organization_id, code, name, description, type, parent_id, level, is_analytical, class, status, created_by, updated_by)
      SELECT __ORG_ID__, 'CC-930', 'TECNOLOGIA', 'TI e Sistemas', 'ANALYTIC', NULL, 0, 'true', 'EXPENSE', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.cost_centers WHERE code = 'CC-930' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);

      INSERT INTO dbo.cost_centers (organization_id, code, name, description, type, parent_id, level, is_analytical, class, status, created_by, updated_by)
      SELECT __ORG_ID__, 'CC-940', 'COMERCIAL', 'Vendas', 'ANALYTIC', NULL, 0, 'true', 'REVENUE', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
      WHERE NOT EXISTS (SELECT 1 FROM dbo.cost_centers WHERE code = 'CC-940' AND organization_id = __ORG_ID__ AND deleted_at IS NULL);
    `;

    await pool.query(
      renderOrgSql(costCenters, orgId).replaceAll("__CREATED_BY__", String(ctx.userId))
    );

    let taxRulesSeeded = 0;
    if (includeTaxMatrix) {
      // Seed Matriz Tributária (opt-in)
      // Matriz tributária:
      // - dbo.tax_matrix é a tabela oficial do AuraCore (usada pelo tax-calculator)
      // - dbo.fiscal_tax_matrix existe em alguns ambientes (migration 0029) e ainda é usada por rotas legacy
      //   → vamos semear nas duas, se existirem.
      const taxMatrix = `
        DECLARE @valid_from DATE = '2020-01-01';

        IF OBJECT_ID(N'dbo.tax_matrix', 'U') IS NOT NULL
        BEGIN
          INSERT INTO dbo.tax_matrix (organization_id, origin_uf, destination_uf, icms_rate, icms_reduction, fcp_rate, cfop_internal, cfop_interstate, cst, regime, valid_from, valid_to, notes, status, created_by, updated_by)
          SELECT __ORG_ID__, 'SP', 'RJ', 12.00, 0.00, 0.00, '5353', '6353', '00', 'NORMAL', @valid_from, NULL, 'Seed enterprise', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
          WHERE NOT EXISTS (SELECT 1 FROM dbo.tax_matrix WHERE organization_id = __ORG_ID__ AND origin_uf = 'SP' AND destination_uf = 'RJ' AND regime = 'NORMAL' AND deleted_at IS NULL);

          INSERT INTO dbo.tax_matrix (organization_id, origin_uf, destination_uf, icms_rate, icms_reduction, fcp_rate, cfop_internal, cfop_interstate, cst, regime, valid_from, valid_to, notes, status, created_by, updated_by)
          SELECT __ORG_ID__, 'SP', 'MG', 12.00, 0.00, 0.00, '5353', '6353', '00', 'NORMAL', @valid_from, NULL, 'Seed enterprise', 'ACTIVE', '__CREATED_BY__', '__CREATED_BY__'
          WHERE NOT EXISTS (SELECT 1 FROM dbo.tax_matrix WHERE organization_id = __ORG_ID__ AND origin_uf = 'SP' AND destination_uf = 'MG' AND regime = 'NORMAL' AND deleted_at IS NULL);
        END;

        IF OBJECT_ID(N'dbo.fiscal_tax_matrix', 'U') IS NOT NULL
        BEGIN
          INSERT INTO dbo.fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, difal_applicable, difal_origin_percentage, difal_destination_percentage, is_active, valid_from, valid_until, legal_basis)
          SELECT __ORG_ID__, 'SP', 'RJ', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0, 0, 1, @valid_from, NULL, 'Seed enterprise'
          WHERE NOT EXISTS (SELECT 1 FROM dbo.fiscal_tax_matrix WHERE organization_id = __ORG_ID__ AND uf_origin = 'SP' AND uf_destination = 'RJ' AND cargo_type = 'GERAL');

          INSERT INTO dbo.fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, difal_applicable, difal_origin_percentage, difal_destination_percentage, is_active, valid_from, valid_until, legal_basis)
          SELECT __ORG_ID__, 'SP', 'MG', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0, 0, 1, @valid_from, NULL, 'Seed enterprise'
          WHERE NOT EXISTS (SELECT 1 FROM dbo.fiscal_tax_matrix WHERE organization_id = __ORG_ID__ AND uf_origin = 'SP' AND uf_destination = 'MG' AND cargo_type = 'GERAL');
        END;
      `;

      await pool.query(
        renderOrgSql(taxMatrix, orgId).replaceAll("__CREATED_BY__", String(ctx.userId))
      );
      taxRulesSeeded = 2;
    }

    return NextResponse.json({
      success: true,
      message: "✅ Seed Enterprise completo!",
      details: {
        accounts_seeded: 8,
        cost_centers_seeded: 6,
        tax_rules_seeded: taxRulesSeeded,
        includeTaxMatrix,
      }
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro no seed:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

