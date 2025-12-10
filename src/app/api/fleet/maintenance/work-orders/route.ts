import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/fleet/maintenance/work-orders
 * Lista ordens de serviço
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
      SELECT 
        wo.*,
        v.plate,
        v.model as vehicle_model_name
      FROM maintenance_work_orders wo
      LEFT JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE wo.organization_id = ${session.user.organizationId}
      AND wo.deleted_at IS NULL
    `;

    if (status) {
      query += ` AND wo.status = '${status}'`;
    }

    query += ` ORDER BY wo.opened_at DESC`;

    const result = await pool.request().query(query);

    return NextResponse.json({
      success: true,
      workOrders: result.recordset,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao listar O.S.:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fleet/maintenance/work-orders
 * Cria nova ordem de serviço
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      vehicleId,
      woType,
      priority = "NORMAL",
      reportedByDriverId,
      reportedIssue,
      odometer,
    } = body;

    await ensureConnection();

    // Gerar número da O.S.
    const numberResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(wo_number, 9, 10) AS INT)), 0) + 1 as next_number
      FROM maintenance_work_orders
      WHERE organization_id = ${session.user.organizationId}
      AND wo_number LIKE 'OS-${new Date().getFullYear()}-%'
    `);

    const nextNumber = numberResult.recordset[0].next_number;
    const woNumber = `OS-${new Date().getFullYear()}-${String(nextNumber).padStart(6, "0")}`;

    const result = await pool.request().query(`
      INSERT INTO maintenance_work_orders (
        organization_id, wo_number, vehicle_id, wo_type, priority,
        reported_by_driver_id, reported_issue, odometer,
        created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId}, '${woNumber}', ${vehicleId}, '${woType}', '${priority}',
        ${reportedByDriverId || "NULL"}, ${reportedIssue ? `'${reportedIssue}'` : "NULL"},
        ${odometer || "NULL"},
        '${session.user.id}', GETDATE()
      )
    `);

    // Se O.S. é crítica, bloquear veículo
    if (priority === "URGENT" || priority === "HIGH") {
      await pool.request().query(`
        UPDATE vehicles
        SET status = 'MAINTENANCE'
        WHERE id = ${vehicleId}
        AND organization_id = ${session.user.organizationId}
      `);
    }

    return NextResponse.json({
      success: true,
      workOrder: result.recordset[0],
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao criar O.S.:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

