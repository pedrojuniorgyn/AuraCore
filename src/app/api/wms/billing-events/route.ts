import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";
    const period = searchParams.get("period");

    const events = await db.execute(sql`
      SELECT 
        id,
        customer_id,
        event_type,
        event_date,
        quantity,
        unit_of_measure as unit,
        unit_price,
        subtotal,
        billing_status as status
      FROM wms_billing_events
      WHERE organization_id = ${organizationId}
        ${period ? sql`AND billing_period = ${period}` : sql``}
      ORDER BY event_date DESC
    `);

    return NextResponse.json({
      success: true,
      data: events.recordset || events
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      organizationId = 1, 
      customerId, 
      eventType, 
      quantity, 
      unitPrice 
    } = body;

    await db.execute(sql`
      INSERT INTO wms_billing_events 
        (organization_id, customer_id, event_type, event_date, quantity, unit_of_measure, unit_price, subtotal, billing_status)
      VALUES 
        (${organizationId}, ${customerId}, ${eventType}, GETDATE(), ${quantity}, 'UN', ${unitPrice}, ${quantity * unitPrice}, 'PENDING')
    `);

    return NextResponse.json({
      success: true,
      message: "Evento registrado com sucesso"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}





























