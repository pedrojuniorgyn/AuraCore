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
    const { cstCode, icmsRate, fcpRate, legalBasis } = body;

    await db.execute(sql`
      UPDATE fiscal_tax_matrix 
      SET cst_code = ${cstCode},
          icms_rate = ${icmsRate},
          fcp_rate = ${fcpRate},
          legal_basis = ${legalBasis || ''}
      WHERE id = ${resolvedParams.id}
    `);

    return NextResponse.json({
      success: true,
      message: "Regra fiscal atualizada"
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
      UPDATE fiscal_tax_matrix 
      SET is_active = 0
      WHERE id = ${resolvedParams.id}
    `);

    return NextResponse.json({
      success: true,
      message: "Regra fiscal desativada"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
