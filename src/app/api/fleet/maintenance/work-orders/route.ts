import { NextRequest, NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/context";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/fleet/maintenance/work-orders
 * Lista ordens de serviço
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    await ensureConnection();

    // E9.3: REPO-005 - branchId obrigatório
    const reqq = pool.request()
      .input("orgId", sql.Int, ctx.organizationId)
      .input("branchId", sql.Int, ctx.branchId);
    if (status) reqq.input("status", sql.NVarChar(50), status);

    const result = await reqq.query(
      `
      SELECT
        wo.*,
        v.plate,
        v.model as vehicle_model_name
      FROM maintenance_work_orders wo
      LEFT JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE wo.organization_id = @orgId
        AND wo.branch_id = @branchId
        AND wo.deleted_at IS NULL
        ${status ? "AND wo.status = @status" : ""}
      ORDER BY wo.opened_at DESC
    `
    );

    return NextResponse.json({
      success: true,
      workOrders: result.recordset,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao listar O.S.:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/fleet/maintenance/work-orders
 * Cria nova ordem de serviço
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

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

    const created = await withMssqlTransaction(
      async (tx) => {
        const year = new Date().getFullYear();

        // SERIALIZABLE + HOLDLOCK garante que 2 requisições não gerem o mesmo número
        const numberResult = await tx
          .request()
          .input("orgId", sql.Int, ctx.organizationId)
          .input("prefix", sql.NVarChar(20), `OS-${year}-%`)
          .query(
            `
            SELECT ISNULL(MAX(CAST(SUBSTRING(wo_number, 9, 10) AS INT)), 0) + 1 as next_number
            FROM maintenance_work_orders WITH (UPDLOCK, HOLDLOCK)
            WHERE organization_id = @orgId
              AND wo_number LIKE @prefix
          `
          );

        const nextNumber = numberResult.recordset?.[0]?.next_number ?? 1;
        const woNumber = `OS-${year}-${String(nextNumber).padStart(6, "0")}`;

        // E9.3: REPO-005 - branchId obrigatório no insert
        const result = await tx
          .request()
          .input("orgId", sql.Int, ctx.organizationId)
          .input("branchId", sql.Int, ctx.branchId)
          .input("woNumber", sql.NVarChar(30), woNumber)
          .input("vehicleId", sql.Int, Number(vehicleId))
          .input("woType", sql.NVarChar(50), String(woType))
          .input("priority", sql.NVarChar(20), String(priority))
          .input("reportedByDriverId", sql.Int, reportedByDriverId ? Number(reportedByDriverId) : null)
          .input("reportedIssue", sql.NVarChar(sql.MAX), reportedIssue ?? null)
          .input("odometer", sql.Int, odometer ? Number(odometer) : null)
          .input("createdBy", sql.NVarChar(255), ctx.userId)
          .query(
            `
            INSERT INTO maintenance_work_orders (
              organization_id, branch_id, wo_number, vehicle_id, wo_type, priority,
              reported_by_driver_id, reported_issue, odometer,
              created_by, created_at
            )
            OUTPUT INSERTED.*
            VALUES (
              @orgId, @branchId, @woNumber, @vehicleId, @woType, @priority,
              @reportedByDriverId, @reportedIssue, @odometer,
              @createdBy, GETDATE()
            )
          `
          );

        if (priority === "URGENT" || priority === "HIGH") {
          await tx
            .request()
            .input("orgId", sql.Int, ctx.organizationId)
            .input("vehicleId", sql.Int, Number(vehicleId))
            .query(
              `
              UPDATE vehicles
              SET status = 'MAINTENANCE'
              WHERE id = @vehicleId
                AND organization_id = @orgId
            `
            );
        }

        return result.recordset?.[0];
      },
      { isolationLevel: sql.ISOLATION_LEVEL.SERIALIZABLE }
    );

    return NextResponse.json({
      success: true,
      workOrder: created,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao criar O.S.:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

