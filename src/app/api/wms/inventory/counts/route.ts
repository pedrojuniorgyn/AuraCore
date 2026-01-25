/**
 * API Routes: /api/wms/inventory/counts
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool, ensureConnection } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/context";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";

// ✅ S1.1 Batch 3 Phase 2: Schema
const createInventoryCountSchema = z.object({
  warehouseId: z.number().int().positive('ID do armazém obrigatório'),
  countType: z.enum(['FULL', 'CYCLE', 'SPOT'], { 
    errorMap: () => ({ message: 'Tipo deve ser FULL, CYCLE ou SPOT' })
  }),
  notes: z.string().max(500).optional(),
});

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
    if (error instanceof Response) {
      return error;
    }
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
    
    // ✅ S1.1 Batch 3 Phase 2: Validate body with Zod
    const validation = createInventoryCountSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { warehouseId, countType, notes } = validation.data;

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
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao iniciar contagem:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

