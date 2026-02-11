import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

import { logger } from '@/shared/infrastructure/logging';
/**
 * 📊 GET /api/fiscal/chart-of-accounts
 * 
 * Lista plano de contas (alias para chart-accounts)
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const result = await db.execute(sql`
      SELECT 
        id,
        code,
        name,
        parent_id AS parentId
      FROM chart_of_accounts
      WHERE organization_id = ${session.user.organizationId}
        AND deleted_at IS NULL
      ORDER BY code ASC
    `);

    return NextResponse.json(result.recordset || []);
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao buscar plano de contas:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});

