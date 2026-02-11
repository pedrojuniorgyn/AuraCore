import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * 🧪 Testar se coluna fiscal_document_id existe
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // Testar query simples
    const result = await db.execute(sql`
      SELECT TOP 1 
        id,
        fiscal_document_id
      FROM accounts_payable
    `);

    return NextResponse.json({
      success: true,
      message: "Coluna existe e está acessível",
      sample: result,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao testar coluna:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});































