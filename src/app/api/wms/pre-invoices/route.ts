import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";

    const invoices = await db.execute(sql`
      SELECT 
        id, billing_period as period, customer_id, 
        subtotal, iss_amount as iss, net_amount as total, status
      FROM wms_pre_invoices
      WHERE organization_id = ${organizationId}
      ORDER BY billing_period DESC
    `);

    return NextResponse.json({
      success: true,
      data: invoices.recordset || invoices
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, customerId, period, subtotal } = body;

    const issAmount = subtotal * 0.05;
    const netAmount = subtotal - issAmount;

    await db.execute(sql`
      INSERT INTO wms_pre_invoices 
        (organization_id, customer_id, billing_period, measurement_date, subtotal, iss_rate, iss_amount, net_amount, status)
      VALUES 
        (${organizationId}, ${customerId}, ${period}, GETDATE(), ${subtotal}, 5.00, ${issAmount}, ${netAmount}, 'DRAFT')
    `);

    return NextResponse.json({ success: true, message: "Pré-fatura gerada" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

























