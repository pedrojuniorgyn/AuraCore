import { NextRequest, NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/context";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/wms/inventory/counts
 * Lista contagens de inventário
 */
export async function GET() {
  try {
    const ctx = await getTenantContext();

    await ensureConnection();

    const result = await pool
      .request()
      .input("orgId", sql.Int, ctx.organizationId)
      .query(
        `
        SELECT * FROM warehouse_inventory_counts
        WHERE organization_id = @orgId
        ORDER BY started_at DESC
      `
      );

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
    const ctx = await getTenantContext();

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

    const created = await withMssqlTransaction(
      async (tx) => {
        const year = new Date().getFullYear();
        const numberResult = await tx
          .request()
          .input("orgId", sql.Int, ctx.organizationId)
          .input("prefix", sql.NVarChar(20), `INV-${year}-%`)
          .query(
            `
            SELECT ISNULL(MAX(CAST(SUBSTRING(count_number, 11, 10) AS INT)), 0) + 1 as next_number
            FROM warehouse_inventory_counts WITH (UPDLOCK, HOLDLOCK)
            WHERE organization_id = @orgId
              AND count_number LIKE @prefix
          `
          );

        const nextNumber = numberResult.recordset?.[0]?.next_number ?? 1;
        const countNumber = `INV-${year}-${String(nextNumber).padStart(6, "0")}`;

        const result = await tx
          .request()
          .input("orgId", sql.Int, ctx.organizationId)
          .input("warehouseId", sql.Int, Number(warehouseId))
          .input("countNumber", sql.NVarChar(30), countNumber)
          .input("countType", sql.NVarChar(20), String(countType))
          .input("notes", sql.NVarChar(sql.MAX), notes ?? null)
          .input("userId", sql.NVarChar(255), ctx.userId)
          .query(
            `
            INSERT INTO warehouse_inventory_counts (
              organization_id, warehouse_id, count_number, count_date,
              count_type, notes, started_by, created_by, created_at
            )
            OUTPUT INSERTED.*
            VALUES (
              @orgId, @warehouseId, @countNumber, GETDATE(),
              @countType, @notes,
              @userId, @userId, GETDATE()
            )
          `
          );

        return result.recordset?.[0];
      },
      { isolationLevel: sql.ISOLATION_LEVEL.SERIALIZABLE }
    );

    return NextResponse.json({
      success: true,
      message: "Contagem iniciada com sucesso",
      count: created,
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

