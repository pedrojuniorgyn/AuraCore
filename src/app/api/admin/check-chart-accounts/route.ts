import { NextRequest, NextResponse } from "next/server";
import { db, getFirstRow, getDbRows } from "@/lib/db";
import { sql } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * 🔍 GET /api/admin/check-chart-accounts
 * 
 * Verifica se o Plano de Contas existe
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const result = await db.execute(sql`
      SELECT 
        COUNT(*) AS total
      FROM chart_of_accounts
      WHERE deleted_at IS NULL
    `);

    const firstRow = getFirstRow<{ total?: number }>(result);
    const total = firstRow?.total || 0;

    if (total === 0) {
      return NextResponse.json({
        exists: false,
        total: 0,
        message: "Nenhum Plano de Contas encontrado. É necessário criar antes de vincular NCMs.",
      });
    }

    // Listar primeiros 10
    const accountsResult = await db.execute(sql`
      SELECT TOP 10
        id,
        code,
        name,
        organization_id AS organizationId
      FROM chart_of_accounts
      WHERE deleted_at IS NULL
      ORDER BY code ASC
    `);

    const accounts = getDbRows<Record<string, unknown>>(accountsResult);
    
    return NextResponse.json({
      exists: true,
      total,
      sample: accounts,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao verificar plano de contas:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});






























