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
    
    const accounts = `
      -- BACKOFFICE CONTAS
      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT __ORG_ID__, '4.3', 'CUSTOS DE APOIO OPERACIONAL', 'Custos dos departamentos de suporte', 'EXPENSE', 0, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3' AND organization_id = __ORG_ID__);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT __ORG_ID__, '4.3.1', 'OFICINA MECÂNICA INTERNA', 'Custos para manter oficina', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3' AND organization_id = __ORG_ID__), 0, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.1' AND organization_id = __ORG_ID__);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '4.3.1.01.001', 'Ferramental e Utensílios', 'Ferramentas oficina', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.1.01.001' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '4.3.1.01.002', 'Gases Industriais', 'Oxigênio/Acetileno', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.1.01.002' AND organization_id = 1);

      -- WMS RECEITAS
      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT 1, '3.1.2', 'RECEITAS LOGÍSTICAS', 'Armazenagem e WMS', 'REVENUE', 0, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '3.1.2.01.001', 'Receita Armazenagem Pallet', 'Cobrança por posição', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2.01.001' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '3.1.2.02.001', 'Receita Inbound', 'Recebimento mercadorias', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2.02.001' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '3.1.2.02.002', 'Receita Outbound', 'Expedição mercadorias', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2.02.002' AND organization_id = 1);

      -- GERENCIAMENTO DE RISCO
      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT 1, '4.1.4', 'CUSTOS DE GERENCIAMENTO RISCO', 'Prevenção perdas', 'EXPENSE', 0, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.1.4' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '4.1.4.01.001', 'Rastreamento Satelital', 'Autotrac/Sascar/Omnilink', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.1.4.01.001' AND organization_id = 1);

      -- CIAP
      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT 1, '1.1.4.05', 'ICMS ATIVO PERMANENTE', 'Crédito 48 meses', 'ASSET', 0, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '1.1.4.05.001', 'CIAP a Recuperar LP', 'Longo prazo', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.4.05.001' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '1.1.4.05.002', 'CIAP a Recuperar CP', 'Curto prazo', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.4.05.002' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '1.1.4.05.003', 'Crédito CIAP do Mês', 'Apropriado mensalmente', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.4.05.003' AND organization_id = 1);

      -- SINISTROS
      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT 1, '1.1.2.06', 'CRÉDITOS SINISTROS', 'A receber seguros', 'ASSET', 0, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.2.06' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
      SELECT 1, '1.1.2.06.001', 'Créditos Seguradoras', 'Indenizações aprovadas', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.2.06' AND organization_id = 1), 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.2.06.001' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT 1, '3.3.1.01.001', 'Receita Indenização Seguros', 'Entrada seguradora', 'REVENUE', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.3.1.01.001' AND organization_id = 1);

      -- INTERCOMPANY
      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT 1, '1.1.9.01.001', 'Conta Corrente Matriz', 'Filial deve à Matriz', 'ASSET', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.9.01.001' AND organization_id = 1);

      INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status)
      SELECT 1, '2.1.9.01.001', 'Conta Corrente Filiais', 'Matriz deve às Filiais', 'LIABILITY', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '2.1.9.01.001' AND organization_id = 1);
    `;

    const accountsSql = accounts
      .replaceAll("organization_id = 1", "organization_id = __ORG_ID__")
      .replaceAll("SELECT 1,", "SELECT __ORG_ID__,")
      .replaceAll("__ORG_ID__", String(orgId));
    await pool.query(accountsSql);

    // Seed Centros de Custo Departamentais
    const costCenters = `
      INSERT INTO financial_cost_centers (organization_id, code, name, description, type, is_analytical, status)
      SELECT __ORG_ID__, 'CC-901', 'OFICINA MECÂNICA', 'Manutenção frota', 'EXPENSE', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_cost_centers WHERE code = 'CC-901' AND organization_id = __ORG_ID__);

      INSERT INTO financial_cost_centers (organization_id, code, name, description, type, is_analytical, status)
      SELECT 1, 'CC-902', 'POSTO INTERNO', 'Abastecimento', 'EXPENSE', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_cost_centers WHERE code = 'CC-902' AND organization_id = 1);

      INSERT INTO financial_cost_centers (organization_id, code, name, description, type, is_analytical, status)
      SELECT 1, 'CC-903', 'LAVA JATO', 'Conservação', 'EXPENSE', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_cost_centers WHERE code = 'CC-903' AND organization_id = 1);

      INSERT INTO financial_cost_centers (organization_id, code, name, description, type, is_analytical, status)
      SELECT 1, 'CC-920', 'RH / D.P.', 'Recursos Humanos', 'EXPENSE', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_cost_centers WHERE code = 'CC-920' AND organization_id = 1);

      INSERT INTO financial_cost_centers (organization_id, code, name, description, type, is_analytical, status)
      SELECT 1, 'CC-930', 'TECNOLOGIA', 'TI e Sistemas', 'EXPENSE', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_cost_centers WHERE code = 'CC-930' AND organization_id = 1);

      INSERT INTO financial_cost_centers (organization_id, code, name, description, type, is_analytical, status)
      SELECT 1, 'CC-940', 'COMERCIAL', 'Vendas', 'REVENUE', 1, 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM financial_cost_centers WHERE code = 'CC-940' AND organization_id = 1);
    `;

    const costCentersSql = costCenters
      .replaceAll("organization_id = 1", "organization_id = __ORG_ID__")
      .replaceAll("SELECT 1,", "SELECT __ORG_ID__,")
      .replaceAll("__ORG_ID__", String(orgId));
    await pool.query(costCentersSql);

    // Seed Matriz Tributária
    const taxMatrix = `
      INSERT INTO fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, legal_basis)
      SELECT __ORG_ID__, 'SP', 'RJ', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'
      WHERE NOT EXISTS (SELECT 1 FROM fiscal_tax_matrix WHERE organization_id = __ORG_ID__ AND uf_origin = 'SP' AND uf_destination = 'RJ' AND cargo_type = 'GERAL');

      INSERT INTO fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, legal_basis)
      SELECT 1, 'SP', 'MG', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'
      WHERE NOT EXISTS (SELECT 1 FROM fiscal_tax_matrix WHERE organization_id = 1 AND uf_origin = 'SP' AND uf_destination = 'MG' AND cargo_type = 'GERAL');

      INSERT INTO fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, legal_basis)
      SELECT 1, 'SP', 'BA', 'GERAL', 1, '00', 'Tributação Normal', 7.00, 2.00, 'Lei BA 7014/96'
      WHERE NOT EXISTS (SELECT 1 FROM fiscal_tax_matrix WHERE organization_id = 1 AND uf_origin = 'SP' AND uf_destination = 'BA' AND cargo_type = 'GERAL');

      INSERT INTO fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, legal_basis)
      SELECT 1, 'SP', 'RS', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'
      WHERE NOT EXISTS (SELECT 1 FROM fiscal_tax_matrix WHERE organization_id = 1 AND uf_origin = 'SP' AND uf_destination = 'RS' AND cargo_type = 'GERAL');

      INSERT INTO fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, legal_basis)
      SELECT 1, 'SP', 'PR', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'
      WHERE NOT EXISTS (SELECT 1 FROM fiscal_tax_matrix WHERE organization_id = 1 AND uf_origin = 'SP' AND uf_destination = 'PR' AND cargo_type = 'GERAL');
    `;

    const taxMatrixSql = taxMatrix
      .replaceAll("organization_id = 1", "organization_id = __ORG_ID__")
      .replaceAll("SELECT 1,", "SELECT __ORG_ID__,")
      .replaceAll("__ORG_ID__", String(orgId));
    await pool.query(taxMatrixSql);

    return NextResponse.json({
      success: true,
      message: "✅ Seed Enterprise completo!",
      details: {
        accounts_seeded: 20,
        cost_centers_seeded: 6,
        tax_rules_seeded: 5
      }
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro no seed:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}












