import { NextRequest, NextResponse } from "next/server";

/**
 * 🧪 ENDPOINT DE TESTE - IMPORTAÇÃO DE NFE
 * 
 * Verifica a estrutura do banco e testa a importação
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection, pool } = await import("@/lib/db");
    await ensureConnection();

    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // 1. Verificar tabelas existentes
    const checkTables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND (TABLE_NAME LIKE '%nfe%' 
          OR TABLE_NAME LIKE '%invoice%' 
          OR TABLE_NAME LIKE '%fsist%'
          OR TABLE_NAME LIKE '%cargo%')
      ORDER BY TABLE_NAME
    `);

    results.checks.tables_found = checkTables.recordset.map(r => r.TABLE_NAME);
    results.checks.has_inbound_invoices = checkTables.recordset.some(r => r.TABLE_NAME === 'inbound_invoices');
    results.checks.has_cargo_documents = checkTables.recordset.some(r => r.TABLE_NAME === 'cargo_documents');
    results.checks.has_fsist = checkTables.recordset.some(r => r.TABLE_NAME.includes('fsist'));

    // 2. Contar NFes já importadas
    const countInvoices = await pool.request().query(`
      SELECT COUNT(*) as total FROM inbound_invoices
    `);
    results.checks.nfes_imported = countInvoices.recordset[0].total;

    // 3. Contar documentos no cargo repository
    const countCargo = await pool.request().query(`
      SELECT COUNT(*) as total FROM cargo_documents
    `);
    results.checks.cargo_documents_count = countCargo.recordset[0].total;

    // 4. Verificar configurações fiscais
    const checkSettings = await pool.request().query(`
      SELECT 
        auto_import_enabled,
        auto_import_interval,
        nfe_environment,
        last_auto_import
      FROM fiscal_settings
    `);
    
    if (checkSettings.recordset.length > 0) {
      results.checks.fiscal_settings = checkSettings.recordset[0];
    } else {
      results.checks.fiscal_settings = null;
      results.checks.fiscal_settings_message = "Nenhuma configuração fiscal encontrada";
    }

    // 5. Verificar se existe tabela fsist_documentos
    if (results.checks.has_fsist) {
      const countFsist = await pool.request().query(`
        SELECT COUNT(*) as total FROM fsist_documentos
      `);
      results.checks.fsist_documents_count = countFsist.recordset[0].total;
      
      // Buscar amostra
      const sampleFsist = await pool.request().query(`
        SELECT TOP 5 
          numero, serie, chave, data_emissao, valor_total
        FROM fsist_documentos
        WHERE tipo_documento = 'NFe'
        ORDER BY data_emissao DESC
      `);
      results.checks.fsist_sample = sampleFsist.recordset;
    }

    // 6. Últimas NFes importadas
    const recentNFes = await pool.request().query(`
      SELECT TOP 10
        number,
        series,
        access_key,
        issue_date,
        total_nfe,
        status,
        created_at
      FROM inbound_invoices
      ORDER BY created_at DESC
    `);
    results.recent_imports = recentNFes.recordset;

    // 7. Análise e diagnóstico
    results.diagnosis = {
      can_import: false,
      reasons: [],
      recommendations: [],
    };

    if (results.checks.has_inbound_invoices && results.checks.has_cargo_documents) {
      results.diagnosis.reasons.push("✅ Tabelas de destino existem");
    } else {
      results.diagnosis.reasons.push("❌ Tabelas de destino não existem");
      results.diagnosis.recommendations.push("Executar migrações: /api/admin/run-final-migration");
    }

    if (results.checks.has_fsist) {
      results.diagnosis.can_import = true;
      results.diagnosis.reasons.push(`✅ Fsist disponível (${results.checks.fsist_documents_count} documentos)`);
      results.diagnosis.recommendations.push("Fonte de dados: Fsist (banco local)");
    } else {
      results.diagnosis.reasons.push("⚠️ Fsist não disponível");
      results.diagnosis.recommendations.push("Opção A: Implementar integração com Fsist");
      results.diagnosis.recommendations.push("Opção B: Usar SEFAZ direto (recomendado)");
      results.diagnosis.recommendations.push("Opção C: Upload manual de XMLs");
    }

    if (!results.checks.fiscal_settings) {
      results.diagnosis.recommendations.push("Configurar fiscal_settings em /configuracoes/fiscal");
    } else if (results.checks.fiscal_settings.auto_import_enabled !== "S") {
      results.diagnosis.recommendations.push("Habilitar auto-import nas configurações fiscais");
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: errorMessage,
        stack: (error instanceof Error ? error.stack : undefined),
      },
      { status: 500 }
    );
  }
}

