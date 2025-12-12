import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";
import { listBTGDDAs } from "@/services/btg/btg-dda";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/btg/dda
 * Listar DDAs autorizados
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureConnection();

    // Buscar DDAs do banco local
    const result = await pool.request().query(`
      SELECT * FROM btg_dda_authorized
      WHERE organization_id = ${session.user.organizationId}
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      ddas: result.recordset,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao listar DDAs:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}













