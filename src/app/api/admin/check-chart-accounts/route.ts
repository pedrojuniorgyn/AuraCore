import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 🔍 GET /api/admin/check-chart-accounts
 * 
 * Verifica se o Plano de Contas existe
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const result = await db.execute(sql`
      SELECT 
        COUNT(*) AS total
      FROM chart_of_accounts
      WHERE deleted_at IS NULL
    `);

    const total = result.recordset[0]?.total || 0;

    if (total === 0) {
      return NextResponse.json({
        exists: false,
        total: 0,
        message: "Nenhum Plano de Contas encontrado. É necessário criar antes de vincular NCMs.",
      });
    }

    // Listar primeiros 10
    const accountsResult = await db.execute(sql`
      SELECT TOP 10
        id,
        code,
        name,
        organization_id AS organizationId
      FROM chart_of_accounts
      WHERE deleted_at IS NULL
      ORDER BY code ASC
    `);

    return NextResponse.json({
      exists: true,
      total,
      sample: accountsResult.recordset,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao verificar plano de contas:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}






























