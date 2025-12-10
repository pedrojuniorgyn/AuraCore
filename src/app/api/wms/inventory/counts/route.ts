import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/wms/inventory/counts
 * Lista contagens de inventário
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureConnection();

    const result = await pool.request().query(`
      SELECT * FROM warehouse_inventory_counts
      WHERE organization_id = ${session.user.organizationId}
      ORDER BY started_at DESC
    `);

    return NextResponse.json({
      success: true,
      counts: result.recordset,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao listar contagens:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wms/inventory/counts
 * Inicia nova contagem de inventário
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { warehouseId, countType, notes } = body;

    // Tipos: FULL (completo), CYCLE (cíclico), SPOT (pontual)
    if (!["FULL", "CYCLE", "SPOT"].includes(countType)) {
      return NextResponse.json(
        { error: "Tipo de contagem inválido" },
        { status: 400 }
      );
    }

    await ensureConnection();

    // Gerar número da contagem
    const numberResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(count_number, 11, 10) AS INT)), 0) + 1 as next_number
      FROM warehouse_inventory_counts
      WHERE organization_id = ${session.user.organizationId}
      AND count_number LIKE 'INV-${new Date().getFullYear()}-%'
    `);

    const nextNumber = numberResult.recordset[0].next_number;
    const countNumber = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(6, "0")}`;

    const result = await pool.request().query(`
      INSERT INTO warehouse_inventory_counts (
        organization_id, warehouse_id, count_number, count_date,
        count_type, notes, started_by, created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId}, ${warehouseId}, '${countNumber}', GETDATE(),
        '${countType}', ${notes ? `'${notes}'` : "NULL"},
        '${session.user.id}', '${session.user.id}', GETDATE()
      )
    `);

    return NextResponse.json({
      success: true,
      message: "Contagem iniciada com sucesso",
      count: result.recordset[0],
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao iniciar contagem:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

