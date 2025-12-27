import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";

    const journeys = await db.execute(sql`
      SELECT 
        dwj.id, dwj.journey_date as date, d.name as driver,
        dwj.total_driving_hours as driving_hours,
        dwj.total_waiting_hours as waiting_hours,
        CASE 
          WHEN dwj.exceeded_max_driving = 1 THEN 'EXCESSO'
          WHEN dwj.insufficient_rest = 1 THEN 'DESCANSO'
          ELSE 'OK'
        END as alert,
        CASE 
          WHEN dwj.exceeded_max_driving = 1 OR dwj.insufficient_rest = 1 THEN 'CRITICAL'
          ELSE 'OK'
        END as status
      FROM driver_work_journey dwj
      LEFT JOIN drivers d ON dwj.driver_id = d.id
      WHERE dwj.organization_id = ${organizationId}
        AND dwj.journey_date >= DATEADD(day, -30, GETDATE())
      ORDER BY dwj.journey_date DESC
    `);

    return NextResponse.json({
      success: true,
      data: journeys.recordset || journeys
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, driverId, journeyDate, drivingHours, waitingHours } = body;

    const exceededMax = drivingHours > 5.5;
    const insufficientRest = waitingHours < 11;

    await db.execute(sql`
      INSERT INTO driver_work_journey 
        (organization_id, driver_id, journey_date, total_driving_hours, total_waiting_hours, exceeded_max_driving, insufficient_rest)
      VALUES 
        (${organizationId}, ${driverId}, ${journeyDate}, ${drivingHours}, ${waitingHours}, ${exceededMax ? 1 : 0}, ${insufficientRest ? 1 : 0})
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Jornada registrada",
      alert: exceededMax || insufficientRest
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}




















