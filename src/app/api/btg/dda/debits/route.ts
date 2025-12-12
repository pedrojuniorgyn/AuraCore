import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/btg/dda/debits
 * Listar débitos DDA
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    await ensureConnection();

    let query = `
      SELECT * FROM btg_dda_debits
      WHERE organization_id = ${session.user.organizationId}
    `;

    if (status) {
      query += ` AND status = '${status}'`;
    }

    query += ` ORDER BY due_date ASC`;

    const result = await pool.request().query(query);

    return NextResponse.json({
      success: true,
      debits: result.recordset,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao listar débitos DDA:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}













