import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { estimatedDamage, notes } = body;

    await db.execute(sql`
      UPDATE claims_management 
      SET estimated_damage = ${estimatedDamage},
          notes = ${notes || ''}
      WHERE id = ${params.id}
    `);

    return NextResponse.json({
      success: true,
      message: "Sinistro atualizado"
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
  { params }: { params: { id: string } }
) {
  try {
    await db.execute(sql`
      DELETE FROM claims_management 
      WHERE id = ${params.id}
        AND claim_status = 'OPENED'
    `);

    return NextResponse.json({
      success: true,
      message: "Sinistro excluído"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}



