import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/fleet/maintenance-plans
 * Lista planos de manutenção
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureConnection();

    const result = await pool.request().query(`
      SELECT *
      FROM vehicle_maintenance_plans
      WHERE organization_id = ${session.user.organizationId}
      AND is_active = 'S'
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      plans: result.recordset,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar planos:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fleet/maintenance-plans
 * Cria novo plano de manutenção
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      vehicleModel,
      serviceName,
      serviceDescription,
      triggerType,
      mileageInterval,
      timeIntervalMonths,
      advanceWarningKm,
      advanceWarningDays,
    } = body;

    await ensureConnection();

    const result = await pool.request().query(`
      INSERT INTO vehicle_maintenance_plans (
        organization_id, vehicle_model, service_name, service_description,
        trigger_type, mileage_interval, time_interval_months,
        advance_warning_km, advance_warning_days,
        created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId}, ${vehicleModel ? `'${vehicleModel}'` : "NULL"},
        '${serviceName}', ${serviceDescription ? `'${serviceDescription}'` : "NULL"},
        '${triggerType}', ${mileageInterval || "NULL"}, ${timeIntervalMonths || "NULL"},
        ${advanceWarningKm || "NULL"}, ${advanceWarningDays || "NULL"},
        '${session.user.id}', GETDATE()
      )
    `);

    return NextResponse.json({
      success: true,
      plan: result.recordset[0],
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar plano:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

