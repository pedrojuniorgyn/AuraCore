import { NextResponse } from "next/server";
import { sql as rawSql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("\n🔄 Migrando NFes para fiscal_documents...\n");

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // MIGRAR NFe - SQL SUPER SIMPLES
    await db.execute(rawSql`
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
        CAST(ISNULL(total_products, 0) AS DECIMAL(18,2)),
        CAST(ISNULL(total_nfe, 0) AS DECIMAL(18,2)),
        ISNULL(nfe_type, 'OTHER'), 'ENTRADA', 'CLASSIFIED', 'CLASSIFIED',
        CASE WHEN nfe_type = 'PURCHASE' THEN 'GENERATED' ELSE 'NO_TITLE' END,
        xml_content, xml_hash, 1, 'SEFAZ',
        GETDATE(), GETDATE(), 1, 1, 1
      FROM inbound_invoices
      WHERE access_key NOT IN (
        SELECT access_key FROM fiscal_documents WHERE access_key IS NOT NULL
      );
    `);

    console.log(`✅ NFes migradas com sucesso!\n`);

    return NextResponse.json({
      success: true,
      message: "NFes migradas com sucesso",
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

