import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import type { RouteContext } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 📦 GET /api/fiscal/documents/:id/items
 * 
 * Retorna itens de um documento fiscal (para Master-Detail)
 */
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const { id } = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const fiscalDocumentId = parseInt(id);

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
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao buscar itens:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});































