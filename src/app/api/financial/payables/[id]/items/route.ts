import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 📦 GET /api/financial/payables/:id/items
 * 
 * Retorna itens detalhados de uma Conta a Pagar (Master-Detail)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const resolvedParams = await params;
    const payableId = parseInt(resolvedParams.id);

    // Buscar conta a pagar
    const payableResult = await db.execute(sql`
      SELECT fiscal_document_id
      FROM accounts_payable
      WHERE id = ${payableId}
    `);

    if (payableResult.recordset.length === 0) {
      return NextResponse.json({ error: "Conta a pagar não encontrada" }, { status: 404 });
    }

    const fiscalDocumentId = payableResult.recordset[0].fiscal_document_id;

    if (!fiscalDocumentId) {
      // Conta a pagar manual (sem NFe vinculada)
      return NextResponse.json([]);
    }

    // Buscar itens da NFe com categorização
    const itemsResult = await db.execute(sql`
      SELECT 
        fdi.id,
        fdi.ncm_code AS ncmCode,
        fdi.description AS productDescription,
        fdi.quantity,
        fdi.unit_price AS unitValue,
        fdi.net_amount AS totalValue,
        fc.name AS categoryName,
        coa.code AS accountCode,
        coa.name AS accountName
      FROM fiscal_document_items fdi
      LEFT JOIN financial_categories fc ON fc.id = fdi.category_id
      LEFT JOIN chart_of_accounts coa ON coa.id = fdi.chart_account_id
      WHERE fdi.fiscal_document_id = ${fiscalDocumentId}
        AND fdi.deleted_at IS NULL
      ORDER BY fdi.item_number ASC
    `);

    const items = itemsResult.recordset.map((item: Record<string, unknown>) => ({
      id: item.id,
      ncmCode: item.ncmCode || "N/A",
      productDescription: item.productDescription,
      quantity: parseFloat(item.quantity) || 0,
      unitValue: parseFloat(item.unitValue) || 0,
      totalValue: parseFloat(item.totalValue) || 0,
      categoryName: item.categoryName || "Não categorizado",
      accountCode: item.accountCode || "N/A",
      accountName: item.accountName || "Não definido",
    }));

    return NextResponse.json(items);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao buscar itens:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
