import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 📦 GET /api/fiscal/documents/:id/items
 * 
 * Retorna itens de um documento fiscal (para Master-Detail)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const resolvedParams = await params;
    const fiscalDocumentId = parseInt(resolvedParams.id);

    // Buscar itens com categorização
    const result = await db.execute(sql`
      SELECT 
        fdi.id,
        fdi.item_number AS itemNumber,
        fdi.description,
        fdi.ncm_code AS ncm,
        fdi.quantity,
        fdi.unit,
        fdi.unit_price AS unitPrice,
        fdi.net_amount AS totalPrice,
        
        -- Categorização
        fdi.category_id AS categoryId,
        fc.name AS categoryName,
        fdi.chart_account_id AS chartAccountId,
        coa.code AS chartAccountCode,
        coa.name AS chartAccountName
        
      FROM fiscal_document_items fdi
      LEFT JOIN financial_categories fc ON fc.id = fdi.category_id
      LEFT JOIN chart_of_accounts coa ON coa.id = fdi.chart_account_id
      WHERE fdi.fiscal_document_id = ${fiscalDocumentId}
        AND fdi.deleted_at IS NULL
      ORDER BY fdi.item_number ASC
    `);

    return NextResponse.json(result.recordset || []);
  } catch (error: any) {
    console.error("❌ Erro ao buscar itens:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


















