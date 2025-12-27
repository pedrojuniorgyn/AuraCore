import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { quantity, unitPrice, notes } = body;
    const subtotal = quantity * unitPrice;

    await db.execute(sql`
      UPDATE wms_billing_events 
      SET quantity = ${quantity},
          unit_price = ${unitPrice},
          subtotal = ${subtotal},
          notes = ${notes || ''}
      WHERE id = ${resolvedParams.id}
    `);

    return NextResponse.json({
      success: true,
      message: "Evento atualizado com sucesso"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    await db.execute(sql`
      DELETE FROM wms_billing_events 
      WHERE id = ${resolvedParams.id}
        AND billing_status = 'PENDING'
    `);

    return NextResponse.json({
      success: true,
      message: "Evento excluído com sucesso"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}



















