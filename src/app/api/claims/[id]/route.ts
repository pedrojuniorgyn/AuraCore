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
    const { estimatedDamage, notes } = body;

    await db.execute(sql`
      UPDATE claims_management 
      SET estimated_damage = ${estimatedDamage},
          notes = ${notes || ''}
      WHERE id = ${resolvedParams.id}
    `);

    return NextResponse.json({
      success: true,
      message: "Sinistro atualizado"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
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
      DELETE FROM claims_management 
      WHERE id = ${resolvedParams.id}
        AND claim_status = 'OPENED'
    `);

    return NextResponse.json({
      success: true,
      message: "Sinistro excluído"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}






























