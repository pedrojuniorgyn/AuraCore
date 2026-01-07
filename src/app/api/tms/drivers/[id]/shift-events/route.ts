import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/tms/drivers/:id/shift-events
 * Registra evento de jornada (início/fim direção, início/fim descanso)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const driverId = parseInt(resolvedParams.id);

    const body = await request.json();
    const { eventType, tripId } = body;

    // Tipos: DRIVE_START, DRIVE_END, REST_START, REST_END
    const validEventTypes = ["DRIVE_START", "DRIVE_END", "REST_START", "REST_END"];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: "Tipo de evento inválido" },
        { status: 400 }
      );
    }

    await ensureConnection();

    // Buscar ou criar jornada do dia
    const today = new Date().toISOString().split("T")[0];
    
    const shiftResult = await pool.request().query(`
      SELECT * FROM driver_work_shifts
      WHERE driver_id = ${driverId}
      AND CAST(shift_date AS DATE) = '${today}'
      AND status = 'IN_PROGRESS'
    `);

    let shift;

    if (shiftResult.recordset.length === 0) {
      // Criar nova jornada
      const createResult = await pool.request().query(`
        INSERT INTO driver_work_shifts (
          driver_id, trip_id, shift_date, started_at, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          ${driverId}, ${tripId || "NULL"}, GETDATE(), GETDATE(), GETDATE()
        )
      `);
      shift = createResult.recordset[0];
    } else {
      shift = shiftResult.recordset[0];
    }

    // Registrar evento
    await pool.request().query(`
      INSERT INTO driver_shift_events (
        work_shift_id, event_type, event_time, source, created_at
      )
      VALUES (
        ${shift.id}, '${eventType}', GETDATE(), 'MANUAL', GETDATE()
      )
    `);

    // Calcular totais
    const eventsResult = await pool.request().query(`
      SELECT event_type, event_time
      FROM driver_shift_events
      WHERE work_shift_id = ${shift.id}
      ORDER BY event_time ASC
    `);

    const events = eventsResult.recordset;
    let totalDrivingHours = 0;
    let totalRestHours = 0;
    let currentDriveStart: Date | null = null;
    let currentRestStart: Date | null = null;

    for (const event of events) {
      if (event.event_type === "DRIVE_START") {
        currentDriveStart = new Date(event.event_time);
      } else if (event.event_type === "DRIVE_END" && currentDriveStart) {
        const duration = (new Date(event.event_time).getTime() - currentDriveStart.getTime()) / (1000 * 60 * 60);
        totalDrivingHours += duration;
        currentDriveStart = null;
      } else if (event.event_type === "REST_START") {
        currentRestStart = new Date(event.event_time);
      } else if (event.event_type === "REST_END" && currentRestStart) {
        const duration = (new Date(event.event_time).getTime() - currentRestStart.getTime()) / (1000 * 60 * 60);
        totalRestHours += duration;
        currentRestStart = null;
      }
    }

    // Verificar violações (Lei 13.103/2015)
    const violations = [];
    if (totalDrivingHours > 5.5 && totalRestHours < 0.5) {
      violations.push("VIOLATION: Motorista dirigiu mais de 5h30min sem descanso mínimo de 30min");
    }

    // Atualizar jornada
    await pool.request().query(`
      UPDATE driver_work_shifts
      SET 
        total_driving_hours = ${totalDrivingHours.toFixed(2)},
        total_rest_hours = ${totalRestHours.toFixed(2)},
        status = ${violations.length > 0 ? "'VIOLATION'" : "'IN_PROGRESS'"},
        violations = ${violations.length > 0 ? `'${JSON.stringify(violations)}'` : "NULL"}
      WHERE id = ${shift.id}
    `);

    return NextResponse.json({
      success: true,
      message: `Evento "${eventType}" registrado com sucesso`,
      shift: {
        ...shift,
        totalDrivingHours: totalDrivingHours.toFixed(2),
        totalRestHours: totalRestHours.toFixed(2),
        violations,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao registrar evento de jornada:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

