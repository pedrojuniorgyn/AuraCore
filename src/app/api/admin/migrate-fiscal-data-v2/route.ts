import { NextResponse } from "next/server";
import { sql as rawSql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🔄 MIGRAÇÃO DE DADOS FISCAIS V2 (SQL Simples)
 */
export async function GET() {
  try {
    console.log("\n🔄 Iniciando Migração de Dados Fiscais V2...\n");

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    let totalMigrated = 0;

    // 1️⃣ MIGRAR NFe
    console.log("1️⃣ Migrando NFes...");
    
    const nfeResult = await db.execute(rawSql`
      INSERT INTO fiscal_documents (
        organization_id, branch_id, document_type, document_number, document_series,
        access_key, partner_id, issue_date, gross_amount, net_amount,
        fiscal_classification, operation_type, fiscal_status, accounting_status, financial_status,
        xml_content, xml_hash, editable, imported_from,
        created_at, updated_at, created_by, updated_by, version
      )
      SELECT 
        organization_id, branch_id, 'NFE', number, series,
        access_key, partner_id, issue_date, 
        ISNULL(total_products, 0), ISNULL(total_nfe, 0),
        ISNULL(nfe_type, 'OTHER'), 'ENTRADA', 'CLASSIFIED', 'CLASSIFIED',
        CASE WHEN nfe_type = 'PURCHASE' THEN 'GENERATED' ELSE 'NO_TITLE' END,
        xml_content, xml_hash, 1, 'SEFAZ',
        created_at, updated_at, 1, 1, 1
      FROM inbound_invoices
      WHERE access_key NOT IN (SELECT access_key FROM fiscal_documents WHERE access_key IS NOT NULL);
    `);
    
    console.log(`✅ NFes migradas`);

    // 2️⃣ MIGRAR CTe
    console.log("2️⃣ Migrando CTes...");
    
    await db.execute(rawSql`
      INSERT INTO fiscal_documents (
        organization_id, branch_id, document_type, document_number, document_series,
        access_key, partner_document, partner_name, issue_date, gross_amount, net_amount,
        fiscal_classification, operation_type, fiscal_status, accounting_status, financial_status,
        xml_content, xml_hash, editable, imported_from,
        created_at, updated_at, created_by, updated_by, version
      )
      SELECT 
        organization_id, branch_id, 'CTE', cte_number, series,
        access_key, shipper_cnpj, shipper_name, issue_date,
        ISNULL(total_value, 0), ISNULL(total_value, 0),
        'CARGO', 'SAIDA', 'CLASSIFIED', 'CLASSIFIED', 'GENERATED',
        xml_content, xml_hash, 1, 'SEFAZ',
        created_at, updated_at, 1, 1, 1
      FROM external_ctes
      WHERE access_key NOT IN (SELECT access_key FROM fiscal_documents WHERE access_key IS NOT NULL);
    `);
    
    console.log("✅ CTes migrados");

    // 3️⃣ MIGRAR ITENS
    console.log("3️⃣ Migrando itens de NFe...");
    
    await db.execute(rawSql`
      INSERT INTO fiscal_document_items (
        fiscal_document_id, organization_id, item_number, product_id, ncm_code,
        description, quantity, unit, unit_price, gross_amount, net_amount,
        chart_account_id, category_id, cost_center_id,
        created_at, updated_at, 1
      )
      SELECT 
        fd.id, ii.organization_id, iii.item_number, iii.product_id, iii.ncm_code,
        iii.description, ISNULL(iii.quantity, 0), ISNULL(iii.unit, 'UN'),
        ISNULL(iii.unit_value, 0), ISNULL(iii.total_value, 0), ISNULL(iii.total_value, 0),
        iii.chart_account_id, iii.category_id, iii.cost_center_id,
        iii.created_at, iii.updated_at, iii.version
      FROM inbound_invoice_items iii
      INNER JOIN inbound_invoices ii ON iii.invoice_id = ii.id
      INNER JOIN fiscal_documents fd ON fd.access_key = ii.access_key AND fd.document_type = 'NFE'
      WHERE NOT EXISTS (
        SELECT 1 FROM fiscal_document_items 
        WHERE fiscal_document_id = fd.id AND item_number = iii.item_number
      );
    `);
    
    console.log("✅ Itens migrados");

    // 4️⃣ ATUALIZAR FKs
    console.log("4️⃣ Atualizando FKs...");
    
    await db.execute(rawSql`
      UPDATE ap
      SET fiscal_document_id = fd.id
      FROM accounts_payable ap
      INNER JOIN inbound_invoices ii ON ap.invoice_id = ii.id
      INNER JOIN fiscal_documents fd ON fd.access_key = ii.access_key AND fd.document_type = 'NFE'
      WHERE ap.fiscal_document_id IS NULL;
      
      UPDATE ar
      SET fiscal_document_id = fd.id
      FROM accounts_receivable ar
      INNER JOIN external_ctes ec ON ar.external_cte_id = ec.id
      INNER JOIN fiscal_documents fd ON fd.access_key = ec.access_key AND fd.document_type = 'CTE'
      WHERE ar.fiscal_document_id IS NULL;
    `);
    
    console.log("✅ FKs atualizadas");

    // Contar total
    const [{ total }] = await db.execute(rawSql`SELECT COUNT(*) as total FROM fiscal_documents`);
    
    console.log(`\n✅ Migração concluída! Total: ${(total as any)?.total || 0} documentos\n`);

    return NextResponse.json({
      success: true,
      message: "Migração executada com sucesso",
      total: (total as any)?.total || 0,
    });
  } catch (error: unknown) {
    console.error("❌ Erro na migração:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

