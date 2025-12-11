import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 📊 GET /api/admin/list-ncm-categories
 * 
 * Lista TODAS as categorizações de NCM (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const result = await db.execute(sql`
      SELECT 
        ncm.id,
        ncm.organization_id AS organizationId,
        ncm.ncm_code AS ncmCode,
        ncm.financial_category_id AS financialCategoryId,
        fc.name AS financialCategoryName,
        ncm.chart_account_id AS chartAccountId,
        coa.code AS chartAccountCode,
        coa.name AS chartAccountName,
        ncm.created_at AS createdAt
      FROM ncm_financial_categories ncm
      LEFT JOIN financial_categories fc ON fc.id = ncm.financial_category_id
      LEFT JOIN chart_of_accounts coa ON coa.id = ncm.chart_account_id
      WHERE ncm.deleted_at IS NULL
      ORDER BY ncm.ncm_code ASC
    `);

    const ncms = result.recordset;

    return NextResponse.json({
      total: ncms.length,
      ncms: ncms.map((n: any) => ({
        id: n.id,
        ncmCode: n.ncmCode,
        category: n.financialCategoryName || "N/A",
        chartAccount: n.chartAccountCode ? `${n.chartAccountCode} - ${n.chartAccountName}` : "N/A",
      })),
    });
  } catch (error: any) {
    console.error("❌ Erro ao listar NCM categories:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}






