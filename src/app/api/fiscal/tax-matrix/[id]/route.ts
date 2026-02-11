import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import type { RouteContext } from '@/shared/infrastructure/di/with-di';
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const PUT = withDI(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { cstCode, icmsRate, fcpRate, legalBasis } = body;

    await db.execute(sql`
      UPDATE fiscal_tax_matrix 
      SET cst_code = ${cstCode},
          icms_rate = ${icmsRate},
          fcp_rate = ${fcpRate},
          legal_basis = ${legalBasis || ''}
      WHERE id = ${id}
    `);

    return NextResponse.json({
      success: true,
      message: "Regra fiscal atualizada"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});

export const DELETE = withDI(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    await db.execute(sql`
      UPDATE fiscal_tax_matrix 
      SET is_active = 0
      WHERE id = ${id}
    `);

    return NextResponse.json({
      success: true,
      message: "Regra fiscal desativada"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});
