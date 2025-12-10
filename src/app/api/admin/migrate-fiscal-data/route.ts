import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  inboundInvoices, 
  inboundInvoiceItems,
  externalCtes,
} from "@/lib/db/schema";
import { 
  fiscalDocuments,
  fiscalDocumentItems,
} from "@/lib/db/schema/accounting";
import { sql as rawSql } from "drizzle-orm";

/**
 * 🔄 MIGRAÇÃO DE DADOS FISCAIS
 * 
 * Migra dados existentes:
 * - inbound_invoices → fiscal_documents (type = NFE)
 * - inbound_invoice_items → fiscal_document_items
 * - external_ctes → fiscal_documents (type = CTE)
 * 
 * Mantém rastreabilidade via fiscal_document_id
 */
export async function GET() {
  try {
    console.log("\n🔄 Iniciando Migração de Dados Fiscais...\n");

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    let nfeMigrated = 0;
    let nfeItemsMigrated = 0;
    let cteMigrated = 0;

    // 1️⃣ MIGRAR NFe (inbound_invoices → fiscal_documents)
    console.log("1️⃣ Migrando NFes (inbound_invoices → fiscal_documents)...");
    
    const result = await db.execute(rawSql`
      INSERT INTO fiscal_documents (
        organization_id,
        branch_id,
        document_type,
        document_number,
        document_series,
        access_key,
        partner_id,
        partner_document,
        partner_name,
        issue_date,
        entry_date,
        gross_amount,
        tax_amount,
        net_amount,
        fiscal_classification,
        cfop,
        operation_type,
        fiscal_status,
        accounting_status,
        financial_status,
        xml_content,
        xml_hash,
        CAST(NULL AS NVARCHAR(MAX)) as notes,
        editable,
        imported_from,
        created_at,
        updated_at,
        deleted_at,
        created_by,
        updated_by,
        version
      )
      SELECT 
        organization_id,
        branch_id,
        'NFE' as document_type,
        number as document_number,
        series as document_series,
        access_key,
        partner_id,
        NULL as partner_document,
        NULL as partner_name,
        issue_date,
        issue_date as entry_date,
        CAST(ISNULL(total_products, 0) AS DECIMAL(18,2)) as gross_amount,
        0.00 as tax_amount,
        CAST(ISNULL(total_nfe, 0) AS DECIMAL(18,2)) as net_amount,
        nfe_type as fiscal_classification,
        NULL as cfop,
        'ENTRADA' as operation_type,
        CASE 
          WHEN status = 'IMPORTED' THEN 'CLASSIFIED'
          ELSE 'IMPORTED'
        END as fiscal_status,
        CASE 
          WHEN status = 'IMPORTED' THEN 'CLASSIFIED'
          ELSE 'PENDING'
        END as accounting_status,
        CASE 
          WHEN nfe_type = 'PURCHASE' THEN 'GENERATED'
          ELSE 'NO_TITLE'
        END as financial_status,
        xml_content,
        xml_hash,
        NULL as notes,
        1 as editable,
        CASE 
          WHEN imported_by = 'SEFAZ_ROBOT' THEN 'SEFAZ'
          ELSE 'MANUAL'
        END as imported_from,
        created_at,
        updated_at,
        deleted_at,
        created_by,
        updated_by,
        version
      FROM inbound_invoices
      WHERE NOT EXISTS (
        SELECT 1 FROM fiscal_documents 
        WHERE fiscal_documents.access_key = inbound_invoices.access_key
      );
      
      SELECT @@ROWCOUNT as affected_rows;
    `);

    nfeMigrated = (result as any).rows?.[0]?.affected_rows || 0;
    console.log(`✅ ${nfeMigrated} NFes migradas`);

    // 2️⃣ MIGRAR NFe ITEMS
    console.log("\n2️⃣ Migrando Itens de NFe...");
    
    const itemsResult = await db.execute(rawSql`
      INSERT INTO fiscal_document_items (
        fiscal_document_id,
        organization_id,
        item_number,
        product_id,
        ncm_code,
        description,
        quantity,
        unit,
        unit_price,
        gross_amount,
        discount_amount,
        net_amount,
        icms_amount,
        ipi_amount,
        pis_amount,
        cofins_amount,
        chart_account_id,
        category_id,
        cost_center_id,
        created_at,
        updated_at,
        version
      )
      SELECT 
        fd.id as fiscal_document_id,
        ii.organization_id,
        iii.item_number,
        iii.product_id,
        iii.ncm_code,
        iii.description,
        ISNULL(iii.quantity, 0) as quantity,
        ISNULL(iii.unit, 'UN') as unit,
        ISNULL(iii.unit_value, 0) as unit_price,
        ISNULL(iii.total_value, 0) as gross_amount,
        0.00 as discount_amount,
        ISNULL(iii.total_value, 0) as net_amount,
        0.00 as icms_amount,
        0.00 as ipi_amount,
        0.00 as pis_amount,
        0.00 as cofins_amount,
        iii.chart_account_id,
        iii.category_id,
        iii.cost_center_id,
        iii.created_at,
        iii.updated_at,
        iii.version
      FROM inbound_invoice_items iii
      INNER JOIN inbound_invoices ii ON iii.invoice_id = ii.id
      INNER JOIN fiscal_documents fd ON fd.access_key = ii.access_key AND fd.document_type = 'NFE'
      WHERE NOT EXISTS (
        SELECT 1 FROM fiscal_document_items 
        WHERE fiscal_document_items.fiscal_document_id = fd.id
          AND fiscal_document_items.item_number = iii.item_number
      );
      
      SELECT @@ROWCOUNT as affected_rows;
    `);

    nfeItemsMigrated = (itemsResult as any).rows?.[0]?.affected_rows || 0;
    console.log(`✅ ${nfeItemsMigrated} itens de NFe migrados`);

    // 3️⃣ MIGRAR CTe (external_ctes → fiscal_documents)
    console.log("\n3️⃣ Migrando CTes (external_ctes → fiscal_documents)...");
    
    const cteResult = await db.execute(rawSql`
      INSERT INTO fiscal_documents (
        organization_id,
        branch_id,
        document_type,
        document_number,
        document_series,
        access_key,
        partner_id,
        partner_document,
        partner_name,
        issue_date,
        gross_amount,
        tax_amount,
        net_amount,
        fiscal_classification,
        cfop,
        operation_type,
        fiscal_status,
        accounting_status,
        financial_status,
        xml_content,
        xml_hash,
        CAST(NULL AS NVARCHAR(MAX)) as notes,
        editable,
        imported_from,
        created_at,
        updated_at,
        deleted_at,
        created_by,
        updated_by,
        version
      )
      SELECT 
        organization_id,
        branch_id,
        'CTE' as document_type,
        cte_number as document_number,
        cte_series as document_series,
        access_key,
        NULL as partner_id,
        shipper_document as partner_document,
        shipper_name as partner_name,
        issue_date,
        CAST(ISNULL(freight_value, 0) AS DECIMAL(18,2)) as gross_amount,
        0.00 as tax_amount,
        CAST(ISNULL(freight_value, 0) AS DECIMAL(18,2)) as net_amount,
        'CARGO' as fiscal_classification,
        cfop,
        'SAIDA' as operation_type,
        'CLASSIFIED' as fiscal_status,
        'CLASSIFIED' as accounting_status,
        'GENERATED' as financial_status,
        xml_content,
        xml_hash,
        NULL as notes,
        1 as editable,
        'SEFAZ' as imported_from,
        created_at,
        updated_at,
        deleted_at,
        created_by,
        updated_by,
        version
      FROM external_ctes
      WHERE NOT EXISTS (
        SELECT 1 FROM fiscal_documents 
        WHERE fiscal_documents.access_key = external_ctes.access_key
      );
      
      SELECT @@ROWCOUNT as affected_rows;
    `);

    cteMigrated = (cteResult as any).rows?.[0]?.affected_rows || 0;
    console.log(`✅ ${cteMigrated} CTes migrados`);

    // 4️⃣ ATUALIZAR FKs em accounts_payable/receivable
    console.log("\n4️⃣ Atualizando FKs em accounts_payable...");
    
    await db.execute(rawSql`
      UPDATE ap
      SET fiscal_document_id = fd.id
      FROM accounts_payable ap
      INNER JOIN inbound_invoices ii ON ap.invoice_id = ii.id
      INNER JOIN fiscal_documents fd ON fd.access_key = ii.access_key AND fd.document_type = 'NFE'
      WHERE ap.fiscal_document_id IS NULL;
    `);

    console.log("✅ FKs atualizadas em accounts_payable");

    console.log("\n5️⃣ Atualizando FKs em accounts_receivable...");
    
    await db.execute(rawSql`
      UPDATE ar
      SET fiscal_document_id = fd.id
      FROM accounts_receivable ar
      INNER JOIN external_ctes ec ON ar.external_cte_id = ec.id
      INNER JOIN fiscal_documents fd ON fd.access_key = ec.access_key AND fd.document_type = 'CTE'
      WHERE ar.fiscal_document_id IS NULL;
    `);

    console.log("✅ FKs atualizadas em accounts_receivable");

    console.log("\n✅ Migração concluída com sucesso!");
    console.log("\n📊 Resumo:");
    console.log(`  ✅ ${nfeMigrated} NFes migradas`);
    console.log(`  ✅ ${nfeItemsMigrated} itens de NFe migrados`);
    console.log(`  ✅ ${cteMigrated} CTes migrados`);
    console.log(`  ✅ FKs atualizadas\n`);

    return NextResponse.json({
      success: true,
      message: "Migração de dados fiscais executada com sucesso",
      summary: {
        nfeMigrated,
        nfeItemsMigrated,
        cteMigrated,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro na migração:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

